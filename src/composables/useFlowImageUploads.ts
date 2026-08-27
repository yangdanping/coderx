import { computed, shallowRef } from 'vue';

import { validateFlowImageFiles } from '@/components/tiptap-editor-flow/uploadPolicy';
import { deletePendingFlowImage, uploadFlowImage } from '@/service/flow/flow.request';
import { createUuidV4 } from '@/utils/uuid';

import type { FlowImageValidationResult } from '@/components/tiptap-editor-flow/uploadPolicy';
import type { FlowImageAsset, FlowImageAttachment } from '@/service/flow/flow.types';

const MAX_ACTIVE_UPLOADS = 3;

export type FlowImageUploadAdapter = (file: File, onProgress: (progress: number) => void, signal: AbortSignal) => Promise<FlowImageAsset>;

export interface FlowImageUploadAdapters {
  uploadImage?: FlowImageUploadAdapter;
  deleteImage?: (mediaId: number) => Promise<void>;
  createClientId?: () => string;
  createObjectUrl?: (file: File) => string;
  revokeObjectUrl?: (url: string) => void;
}

interface QueueEntry {
  clientId: string;
  generation: number;
}

interface ActiveUpload extends QueueEntry {
  controller: AbortController;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '图片上传失败，请重试';
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function useFlowImageUploads(adapters: FlowImageUploadAdapters = {}) {
  const uploadImage = adapters.uploadImage ?? uploadFlowImage;
  const deleteImage = adapters.deleteImage ?? deletePendingFlowImage;
  const createClientId = adapters.createClientId ?? createUuidV4;
  const createObjectUrl = adapters.createObjectUrl ?? ((file: File) => URL.createObjectURL(file));
  const revokeObjectUrl = adapters.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url));

  const attachmentState = shallowRef<FlowImageAttachment[]>([]);
  const pending: QueueEntry[] = [];
  const active = new Map<string, ActiveUpload>();
  const generations = new Map<string, number>();
  const revokedClientIds = new Set<string>();
  const deletionPromises = new Map<string, Promise<boolean>>();
  const deletingClientIds = shallowRef<ReadonlySet<string>>(new Set());
  let activeCount = 0;
  let disposed = false;

  const attachments = computed<readonly Readonly<FlowImageAttachment>[]>(() => Object.freeze(attachmentState.value.map((attachment) => Object.freeze({ ...attachment }))));
  const isUploading = computed(
    () => deletingClientIds.value.size > 0 || attachmentState.value.some((attachment) => attachment.status === 'queued' || attachment.status === 'uploading'),
  );
  const hasFailed = computed(() => attachmentState.value.some((attachment) => attachment.status === 'failed'));
  const uploadedMediaIds = computed(() =>
    attachmentState.value.flatMap((attachment) =>
      attachment.status === 'uploaded' && attachment.mediaId !== null && !deletingClientIds.value.has(attachment.clientId) ? [attachment.mediaId] : [],
    ),
  );

  function setDeleting(clientId: string, deleting: boolean): void {
    const next = new Set(deletingClientIds.value);
    if (deleting) next.add(clientId);
    else next.delete(clientId);
    deletingClientIds.value = next;
  }

  function findAttachment(clientId: string): FlowImageAttachment | undefined {
    return attachmentState.value.find((attachment) => attachment.clientId === clientId);
  }

  function replaceAttachment(clientId: string, update: (attachment: FlowImageAttachment) => FlowImageAttachment): boolean {
    const index = attachmentState.value.findIndex((attachment) => attachment.clientId === clientId);
    if (index < 0) return false;
    const next = attachmentState.value.slice();
    next[index] = update(next[index]!);
    attachmentState.value = next;
    return true;
  }

  function nextGeneration(clientId: string): number {
    const generation = (generations.get(clientId) ?? 0) + 1;
    generations.set(clientId, generation);
    return generation;
  }

  function isCurrent(clientId: string, generation: number): boolean {
    return !disposed && generations.get(clientId) === generation && findAttachment(clientId) !== undefined;
  }

  function revokePreview(attachment: FlowImageAttachment): void {
    if (revokedClientIds.has(attachment.clientId)) return;
    revokedClientIds.add(attachment.clientId);
    revokeObjectUrl(attachment.previewUrl);
  }

  function discardPending(clientId: string): void {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (pending[index]?.clientId === clientId) pending.splice(index, 1);
    }
  }

  function removeLocal(attachment: FlowImageAttachment): void {
    nextGeneration(attachment.clientId);
    discardPending(attachment.clientId);
    attachmentState.value = attachmentState.value.filter((candidate) => candidate.clientId !== attachment.clientId);
    revokePreview(attachment);
  }

  function schedule(): void {
    if (disposed) return;
    while (activeCount < MAX_ACTIVE_UPLOADS && pending.length > 0) {
      const entry = pending.shift()!;
      const attachment = findAttachment(entry.clientId);
      if (!attachment || attachment.status !== 'queued' || generations.get(entry.clientId) !== entry.generation) {
        continue;
      }
      startUpload(attachment, entry.generation);
    }
  }

  function startUpload(attachment: FlowImageAttachment, generation: number): void {
    const controller = new AbortController();
    const activeUpload: ActiveUpload = { clientId: attachment.clientId, generation, controller };
    active.set(attachment.clientId, activeUpload);
    activeCount += 1;
    replaceAttachment(attachment.clientId, (current) => ({
      ...current,
      status: 'uploading',
      progress: 0,
      error: null,
    }));

    let request: Promise<FlowImageAsset>;
    try {
      request = uploadImage(
        attachment.file,
        (progress) => {
          if (!isCurrent(attachment.clientId, generation)) return;
          const current = findAttachment(attachment.clientId);
          if (current?.status !== 'uploading') return;
          replaceAttachment(attachment.clientId, (item) => ({
            ...item,
            progress: clampProgress(progress),
          }));
        },
        controller.signal,
      );
    } catch (error) {
      request = Promise.reject(error);
    }

    void request
      .then((asset) => {
        if (!isCurrent(attachment.clientId, generation) || controller.signal.aborted) return;
        replaceAttachment(attachment.clientId, (current) => ({
          ...current,
          status: 'uploaded',
          progress: 100,
          mediaId: asset.id,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          width: asset.width,
          height: asset.height,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (!isCurrent(attachment.clientId, generation) || controller.signal.aborted) return;
        replaceAttachment(attachment.clientId, (current) => ({
          ...current,
          status: 'failed',
          error: errorMessage(error),
        }));
      })
      .finally(() => {
        const currentActive = active.get(attachment.clientId);
        if (currentActive === activeUpload) {
          active.delete(attachment.clientId);
        }
        activeCount -= 1;
        schedule();
      });
  }

  function addFiles(files: readonly File[]): FlowImageValidationResult {
    if (disposed) throw new Error('Flow image upload queue has been disposed');
    const result = validateFlowImageFiles(files, attachmentState.value.length);
    if (result.accepted.length === 0) return result;

    const additions = result.accepted.map((file) => {
      const clientId = createClientId();
      const generation = nextGeneration(clientId);
      const attachment: FlowImageAttachment = {
        clientId,
        file,
        previewUrl: createObjectUrl(file),
        status: 'queued',
        progress: 0,
        mediaId: null,
        url: null,
        thumbnailUrl: null,
        width: null,
        height: null,
        error: null,
      };
      pending.push({ clientId, generation });
      return attachment;
    });
    attachmentState.value = [...attachmentState.value, ...additions];
    schedule();
    return result;
  }

  function retry(clientId: string): boolean {
    if (disposed) return false;
    const attachment = findAttachment(clientId);
    if (!attachment || attachment.status !== 'failed') return false;
    const generation = nextGeneration(clientId);
    replaceAttachment(clientId, (current) => ({
      ...current,
      status: 'queued',
      progress: 0,
      mediaId: null,
      url: null,
      thumbnailUrl: null,
      width: null,
      height: null,
      error: null,
    }));
    pending.push({ clientId, generation });
    schedule();
    return true;
  }

  async function remove(clientId: string): Promise<boolean> {
    const existingDeletion = deletionPromises.get(clientId);
    if (existingDeletion) return existingDeletion;
    const attachment = findAttachment(clientId);
    if (!attachment) return false;

    if (attachment.status === 'uploaded' && attachment.mediaId !== null) {
      replaceAttachment(clientId, (current) => ({ ...current, error: null }));
      setDeleting(clientId, true);
      const generation = generations.get(clientId) ?? 0;
      const deletion = (async () => {
        try {
          await deleteImage(attachment.mediaId!);
          if (!isCurrent(clientId, generation)) return false;
          const current = findAttachment(clientId);
          if (!current || current.status !== 'uploaded') return false;
          removeLocal(current);
          return true;
        } catch (error) {
          if (isCurrent(clientId, generation)) {
            replaceAttachment(clientId, (current) => ({
              ...current,
              error: errorMessage(error),
            }));
          }
          return false;
        } finally {
          deletionPromises.delete(clientId);
          setDeleting(clientId, false);
        }
      })();
      deletionPromises.set(clientId, deletion);
      return deletion;
    }

    const activeUpload = active.get(clientId);
    removeLocal(attachment);
    activeUpload?.controller.abort();
    return true;
  }

  function move(from: number, to: number): boolean {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= attachmentState.value.length || to >= attachmentState.value.length || from === to) {
      return false;
    }
    const next = attachmentState.value.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    attachmentState.value = next;
    return true;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    pending.splice(0, pending.length);
    for (const attachment of attachmentState.value) {
      nextGeneration(attachment.clientId);
      revokePreview(attachment);
    }
    attachmentState.value = [];
    deletingClientIds.value = new Set();
    for (const upload of active.values()) upload.controller.abort();
    generations.clear();
    revokedClientIds.clear();
  }

  return {
    attachments,
    isUploading,
    hasFailed,
    uploadedMediaIds,
    addFiles,
    retry,
    remove,
    move,
    dispose,
  };
}
