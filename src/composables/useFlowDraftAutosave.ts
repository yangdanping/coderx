import { computed, onBeforeUnmount, readonly, shallowRef } from 'vue';
import { useMutation } from '@tanstack/vue-query';

import { createDraftSaveScheduler } from '@/composables/useDraftAutosave';
import { deleteFlowDraftRequest, getFlowDraftRequest, saveFlowDraftRequest } from '@/service/flow/flow-draft.request';
import { LocalCache } from '@/utils';

import type { TiptapDocContent } from '@/service/draft/draft.types';
import type { FlowImageAsset } from '@/service/flow/flow.types';
import type {
  FlowDraftLocalFallback,
  FlowDraftMeta,
  FlowDraftRecord,
  FlowDraftRestoreState,
  FlowDraftSnapshot,
} from '@/service/flow/flow-draft.types';

export type FlowDraftAutosaveStatus = 'idle' | 'hydrating' | 'local' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict' | 'clearing';

export interface UseFlowDraftAutosaveOptions {
  userId: number | null;
  canSync: boolean;
  debounceMs?: number;
}

export interface FlowDraftRestoreResolution {
  source: 'local' | 'remote' | 'empty';
  snapshot: FlowDraftSnapshot | null;
  state: FlowDraftRestoreState | null;
}

interface QueuedFlowDraftSnapshot {
  revision: number;
  snapshot: FlowDraftSnapshot;
}

const FLOW_DRAFT_CACHE_PREFIX = 'coderx_flow_draft_v1';
const FLOW_DRAFT_SCHEMA_VERSION = 2;

const createEmptyFlowDocument = (): TiptapDocContent => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

const isPlainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizePositiveIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0)));
};

export const normalizeFlowDraftDocument = (content: unknown): TiptapDocContent => {
  if (isPlainObject(content) && typeof content['type'] === 'string') {
    return content as TiptapDocContent;
  }

  return createEmptyFlowDocument();
};

const normalizeFlowDraftMeta = (meta: unknown): FlowDraftMeta => {
  const candidate = isPlainObject(meta) ? meta : {};
  return {
    ...candidate,
    imageIds: normalizePositiveIds(candidate['imageIds']),
    videoIds: normalizePositiveIds(candidate['videoIds']),
  };
};

const normalizeFlowDraftSnapshot = (snapshot: FlowDraftSnapshot): FlowDraftSnapshot => ({
  content: normalizeFlowDraftDocument(snapshot.content),
  meta: normalizeFlowDraftMeta(snapshot.meta),
});

const isFlowImageAsset = (value: unknown): value is FlowImageAsset =>
  isPlainObject(value) &&
  typeof value['id'] === 'number' &&
  Number.isSafeInteger(value['id']) &&
  value['id'] > 0 &&
  typeof value['url'] === 'string' &&
  typeof value['thumbnailUrl'] === 'string' &&
  value['mimeType'] === 'image/webp' &&
  typeof value['sizeBytes'] === 'number' &&
  Number.isFinite(value['sizeBytes']) &&
  typeof value['width'] === 'number' &&
  Number.isFinite(value['width']) &&
  typeof value['height'] === 'number' &&
  Number.isFinite(value['height']);

const normalizeFlowImageAssets = (value: unknown): FlowImageAsset[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  return value.filter((candidate): candidate is FlowImageAsset => {
    if (!isFlowImageAsset(candidate) || seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
};

const selectFlowDraftImages = (imageIds: number[], assets: unknown): { images: FlowImageAsset[]; imagesComplete: boolean } => {
  const assetsById = new Map(normalizeFlowImageAssets(assets).map((asset) => [asset.id, asset]));
  const images: FlowImageAsset[] = [];
  let imagesComplete = true;
  for (const imageId of imageIds) {
    const image = assetsById.get(imageId);
    if (!image) {
      imagesComplete = false;
      continue;
    }
    images.push(image);
  }
  return { images, imagesComplete };
};

const createRestoreState = (snapshot: FlowDraftSnapshot, assets: unknown): FlowDraftRestoreState => {
  const normalizedSnapshot = normalizeFlowDraftSnapshot(snapshot);
  const selectedImages = selectFlowDraftImages(normalizedSnapshot.meta.imageIds, assets);
  return { ...normalizedSnapshot, ...selectedImages };
};

const incompleteImagesMessage = '部分图片未能恢复，请重新上传缺失图片后再保存草稿';

const nodeHasMeaningfulText = (node: TiptapDocContent | undefined): boolean => {
  if (!node || typeof node !== 'object') return false;

  if (node.type === 'text') {
    return typeof node.text === 'string' && node.text.trim().length > 0;
  }

  return node.content?.some((child) => nodeHasMeaningfulText(child)) ?? false;
};

export const hasMeaningfulFlowDraft = (snapshot: FlowDraftSnapshot | null): boolean => {
  if (!snapshot) return false;
  return nodeHasMeaningfulText(snapshot.content) || snapshot.meta.imageIds.length > 0 || snapshot.meta.videoIds.length > 0;
};

const normalizeUserId = (userId: number | null) => (typeof userId === 'number' && Number.isSafeInteger(userId) && userId > 0 ? userId : null);

const getFlowDraftActorKey = (userId: number | null) => {
  const normalizedUserId = normalizeUserId(userId);
  return normalizedUserId ? `user:${normalizedUserId}` : 'guest';
};

export const getFlowDraftLocalStorageKey = (userId: number | null) => `${FLOW_DRAFT_CACHE_PREFIX}:${getFlowDraftActorKey(userId)}`;

const parseTime = (value?: string | null) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const resolveFlowDraftRestore = (local: FlowDraftLocalFallback | null, remote: FlowDraftRecord | null): FlowDraftRestoreResolution => {
  if (local && remote) {
    const remoteUpdatedAt = remote.updateAt ?? remote.createAt ?? null;
    if (parseTime(local.localUpdatedAt) > parseTime(remoteUpdatedAt)) {
      const snapshot = normalizeFlowDraftSnapshot(local);
      const state = createRestoreState(snapshot, local.schemaVersion === 2 ? local.images : remote.images);
      return { source: 'local', snapshot, state };
    }

    const snapshot = normalizeFlowDraftSnapshot({ content: remote.content, meta: remote.meta });
    return {
      source: 'remote',
      snapshot,
      state: createRestoreState(snapshot, remote.images),
    };
  }

  if (local) {
    const snapshot = normalizeFlowDraftSnapshot(local);
    const state = createRestoreState(snapshot, local.schemaVersion === 2 ? local.images : undefined);
    return { source: 'local', snapshot, state };
  }

  if (remote) {
    const snapshot = normalizeFlowDraftSnapshot({ content: remote.content, meta: remote.meta });
    return {
      source: 'remote',
      snapshot,
      state: createRestoreState(snapshot, remote.images),
    };
  }

  return { source: 'empty', snapshot: null, state: null };
};

const getErrorStatus = (error: unknown) => {
  if (!isPlainObject(error) || !isPlainObject(error['response'])) return undefined;
  const status = error['response']['status'];
  return typeof status === 'number' ? status : undefined;
};

const getErrorMessage = (error: unknown) => {
  if (isPlainObject(error) && isPlainObject(error['response']) && isPlainObject(error['response']['data'])) {
    const responseData = error['response']['data'];
    const message = responseData['msg'] ?? responseData['message'];
    if (typeof message === 'string' && message.trim()) return message;
  }

  return error instanceof Error && error.message ? error.message : undefined;
};

export function useFlowDraftAutosave(options: UseFlowDraftAutosaveOptions) {
  const userId = normalizeUserId(options.userId);
  const actorKey = getFlowDraftActorKey(userId);
  const localStorageKey = getFlowDraftLocalStorageKey(userId);
  const canSync = options.canSync && userId !== null;

  const status = shallowRef<FlowDraftAutosaveStatus>('idle');
  const errorMessage = shallowRef('');
  const draftId = shallowRef<number | null>(null);
  const version = shallowRef(0);
  const lastSavedAt = shallowRef<string | null>(null);
  const latestSnapshot = shallowRef<FlowDraftSnapshot | null>(null);
  const latestImages = shallowRef<FlowImageAsset[]>([]);
  const latestImagesComplete = shallowRef(true);
  const hasLocalFallback = shallowRef(false);
  const isHydrating = shallowRef(false);
  const isClearing = shallowRef(false);

  let latestRevision = 0;
  let latestLocalUpdatedAt: string | null = null;
  let lifecycleGeneration = 0;

  const invalidateInitialize = () => {
    lifecycleGeneration += 1;
    isHydrating.value = false;
  };

  const mutation = useMutation({
    mutationFn: async (payload: QueuedFlowDraftSnapshot) => {
      const response = await saveFlowDraftRequest({
        content: payload.snapshot.content,
        meta: payload.snapshot.meta,
        version: version.value,
      });
      return response.data;
    },
    scope: {
      id: `flow-draft:${actorKey}`,
    },
  });

  const removeLocalFallback = () => {
    LocalCache.removeCache(localStorageKey);
    hasLocalFallback.value = false;
    latestLocalUpdatedAt = null;
  };

  const persistLocalSnapshot = (
    snapshot: FlowDraftSnapshot,
    timestamps: { localUpdatedAt?: string; serverUpdatedAt?: string | null; images?: readonly FlowImageAsset[] } = {},
  ) => {
    const normalizedSnapshot = normalizeFlowDraftSnapshot(snapshot);
    const selectedImages = selectFlowDraftImages(normalizedSnapshot.meta.imageIds, timestamps.images ?? latestImages.value);
    const localUpdatedAt = timestamps.localUpdatedAt ?? new Date().toISOString();
    const serverUpdatedAt = timestamps.serverUpdatedAt === undefined ? lastSavedAt.value : timestamps.serverUpdatedAt;

    latestSnapshot.value = normalizedSnapshot;
    latestImages.value = selectedImages.images;
    latestImagesComplete.value = selectedImages.imagesComplete;
    latestLocalUpdatedAt = localUpdatedAt;
    LocalCache.setCache(localStorageKey, {
      schemaVersion: FLOW_DRAFT_SCHEMA_VERSION,
      actorKey,
      ...normalizedSnapshot,
      images: selectedImages.images,
      draftId: draftId.value,
      version: version.value,
      serverUpdatedAt,
      localUpdatedAt,
    } satisfies FlowDraftLocalFallback);
    hasLocalFallback.value = true;
  };

  const readLocalFallback = (): FlowDraftLocalFallback | null => {
    let cached: unknown;
    try {
      cached = LocalCache.getCache(localStorageKey);
    } catch {
      removeLocalFallback();
      return null;
    }

    if (!isPlainObject(cached) || (cached['schemaVersion'] !== 1 && cached['schemaVersion'] !== FLOW_DRAFT_SCHEMA_VERSION) || cached['actorKey'] !== actorKey) {
      if (cached !== undefined) removeLocalFallback();
      return null;
    }

    const localUpdatedAt = cached['localUpdatedAt'];
    if (typeof localUpdatedAt !== 'string' || !isPlainObject(cached['content'])) {
      removeLocalFallback();
      return null;
    }

    const cachedDraftId = cached['draftId'];
    const cachedVersion = cached['version'];
    const schemaVersion = cached['schemaVersion'];
    if (schemaVersion !== 1 && schemaVersion !== FLOW_DRAFT_SCHEMA_VERSION) {
      removeLocalFallback();
      return null;
    }

    return {
      schemaVersion,
      actorKey,
      content: normalizeFlowDraftDocument(cached['content']),
      meta: normalizeFlowDraftMeta(cached['meta']),
      ...(schemaVersion === FLOW_DRAFT_SCHEMA_VERSION ? { images: normalizeFlowImageAssets(cached['images']) } : {}),
      draftId: typeof cachedDraftId === 'number' && Number.isSafeInteger(cachedDraftId) && cachedDraftId > 0 ? cachedDraftId : null,
      version: typeof cachedVersion === 'number' && Number.isSafeInteger(cachedVersion) && cachedVersion >= 0 ? cachedVersion : 0,
      serverUpdatedAt: typeof cached['serverUpdatedAt'] === 'string' ? cached['serverUpdatedAt'] : null,
      localUpdatedAt,
    };
  };

  const hydrateFromRemote = (draft: FlowDraftRecord) => {
    draftId.value = draft.id;
    version.value = draft.version;
    lastSavedAt.value = draft.updateAt ?? draft.createAt ?? null;
  };

  const hydrateFromLocal = (local: FlowDraftLocalFallback) => {
    draftId.value = local.draftId;
    version.value = local.version;
    lastSavedAt.value = local.serverUpdatedAt;
    latestLocalUpdatedAt = local.localUpdatedAt;
  };

  const resetState = () => {
    draftId.value = null;
    version.value = 0;
    lastSavedAt.value = null;
    latestSnapshot.value = null;
    latestImages.value = [];
    latestImagesComplete.value = true;
    latestRevision = 0;
    latestLocalUpdatedAt = null;
    hasLocalFallback.value = false;
    errorMessage.value = '';
    status.value = 'idle';
  };

  const scheduler = createDraftSaveScheduler<QueuedFlowDraftSnapshot, FlowDraftRecord>({
    debounceMs: options.debounceMs ?? 1200,
    save: (payload) => mutation.mutateAsync(payload),
    onDirty: () => {
      if (!isHydrating.value && status.value !== 'conflict') {
        status.value = 'dirty';
        errorMessage.value = '';
      }
    },
    onSaving: () => {
      status.value = 'saving';
    },
    onSaved: (draft, savedPayload) => {
      hydrateFromRemote(draft);
      errorMessage.value = '';

      const serverUpdatedAt = draft.updateAt ?? new Date().toISOString();
      const savedLatestRevision = savedPayload.revision === latestRevision;
      if (!latestImagesComplete.value) {
        status.value = 'error';
        errorMessage.value = incompleteImagesMessage;
      } else if (savedLatestRevision) {
        latestLocalUpdatedAt = serverUpdatedAt;
        status.value = 'saved';
      } else {
        status.value = 'dirty';
      }

      if (latestSnapshot.value) {
        persistLocalSnapshot(latestSnapshot.value, {
          localUpdatedAt: latestLocalUpdatedAt ?? serverUpdatedAt,
          serverUpdatedAt,
        });
      }
    },
    onError: (error) => {
      if (getErrorStatus(error) === 409) {
        status.value = 'conflict';
        errorMessage.value = getErrorMessage(error) ?? '草稿版本冲突，请刷新页面后重试';
        return 'halt';
      }

      status.value = 'error';
      errorMessage.value = getErrorMessage(error) ?? '保存失败，本地草稿仍在';
      return 'continue';
    },
  });

  const queueServerSave = (snapshot: FlowDraftSnapshot) => {
    scheduler.schedule({
      revision: latestRevision,
      snapshot,
    });
  };

  const initialize = async (): Promise<FlowDraftRestoreState | null> => {
    const initializeGeneration = lifecycleGeneration;
    const revisionAtStart = latestRevision;
    isHydrating.value = true;
    status.value = 'hydrating';
    errorMessage.value = '';

    const local = readLocalFallback();
    if (local) {
      hydrateFromLocal(local);
    }
    let remote: FlowDraftRecord | null = null;
    let restoredState: FlowDraftRestoreState | null = null;
    let snapshotToSync: FlowDraftSnapshot | null = null;

    try {
      if (canSync) {
        const response = await getFlowDraftRequest();
        if (lifecycleGeneration !== initializeGeneration) return null;
        remote = response.data;
      }

      if (latestRevision !== revisionAtStart) {
        if (remote) {
          hydrateFromRemote(remote);
        } else if (local) {
          hydrateFromLocal(local);
        }

        if (latestSnapshot.value) {
          persistLocalSnapshot(latestSnapshot.value, {
            localUpdatedAt: latestLocalUpdatedAt ?? new Date().toISOString(),
            serverUpdatedAt: lastSavedAt.value,
            images: latestImages.value,
          });
          snapshotToSync = canSync && latestImagesComplete.value ? latestSnapshot.value : null;
        }
        if (!latestImagesComplete.value) {
          status.value = 'error';
          errorMessage.value = incompleteImagesMessage;
        } else {
          status.value = snapshotToSync ? 'dirty' : 'local';
        }
      } else {
        const resolution = resolveFlowDraftRestore(local, remote);
        restoredState = resolution.state;

        if (remote) {
          hydrateFromRemote(remote);
        } else if (local) {
          hydrateFromLocal(local);
        }

        if (resolution.source === 'remote' && remote && restoredState) {
          latestSnapshot.value = restoredState;
          const serverUpdatedAt = remote.updateAt ?? remote.createAt ?? new Date().toISOString();
          persistLocalSnapshot(restoredState, {
            localUpdatedAt: serverUpdatedAt,
            serverUpdatedAt,
            images: restoredState.images,
          });
          status.value = restoredState.imagesComplete ? 'saved' : 'error';
          if (!restoredState.imagesComplete) errorMessage.value = incompleteImagesMessage;
        } else if (resolution.source === 'local' && local && restoredState) {
          latestSnapshot.value = restoredState;
          latestImages.value = restoredState.images;
          latestImagesComplete.value = restoredState.imagesComplete;
          latestLocalUpdatedAt = local.localUpdatedAt;
          if (restoredState.imagesComplete || local.schemaVersion === 2) {
            persistLocalSnapshot(restoredState, {
              localUpdatedAt: local.localUpdatedAt,
              serverUpdatedAt: remote?.updateAt ?? remote?.createAt ?? local.serverUpdatedAt,
              images: restoredState.images,
            });
          }
          snapshotToSync = canSync && restoredState.imagesComplete ? restoredState : null;
          status.value = restoredState.imagesComplete ? (canSync ? 'dirty' : 'local') : 'error';
          if (!restoredState.imagesComplete) errorMessage.value = incompleteImagesMessage;
        } else {
          status.value = 'idle';
        }
      }
    } catch (error) {
      if (lifecycleGeneration !== initializeGeneration) return null;
      if (latestRevision === revisionAtStart && local) {
        hydrateFromLocal(local);
        restoredState = createRestoreState(normalizeFlowDraftSnapshot(local), local.schemaVersion === 2 ? local.images : undefined);
        latestSnapshot.value = restoredState;
        latestImages.value = restoredState.images;
        latestImagesComplete.value = restoredState.imagesComplete;
        hasLocalFallback.value = true;
      }
      status.value = 'error';
      errorMessage.value = getErrorMessage(error) ?? '保存失败，本地草稿仍在';
    } finally {
      if (lifecycleGeneration === initializeGeneration) isHydrating.value = false;
    }

    if (snapshotToSync && lifecycleGeneration === initializeGeneration) {
      latestRevision += 1;
      queueServerSave(snapshotToSync);
    }

    return restoredState;
  };

  const recordSnapshot = (snapshot: FlowDraftSnapshot, uploadedAssets: readonly FlowImageAsset[] = []) => {
    if (isClearing.value) {
      return false;
    }

    const normalizedSnapshot = normalizeFlowDraftSnapshot(snapshot);
    latestSnapshot.value = normalizedSnapshot;
    latestRevision += 1;

    if (!hasMeaningfulFlowDraft(normalizedSnapshot) && !draftId.value && !scheduler.isInFlight()) {
      scheduler.cancel();
      removeLocalFallback();
      latestImages.value = [];
      latestImagesComplete.value = true;
      status.value = 'idle';
      errorMessage.value = '';
      return true;
    }

    const selectedImages = selectFlowDraftImages(normalizedSnapshot.meta.imageIds, uploadedAssets);
    persistLocalSnapshot(normalizedSnapshot, { images: selectedImages.images });

    if (!selectedImages.imagesComplete) {
      scheduler.cancel();
      errorMessage.value = incompleteImagesMessage;
      status.value = 'error';
      return true;
    }

    if (!canSync) {
      status.value = 'local';
      errorMessage.value = '';
      return true;
    }

    if (!isHydrating.value && status.value !== 'conflict') {
      queueServerSave(normalizedSnapshot);
    }

    return true;
  };

  const flushPendingSave = async () => {
    await scheduler.flush();
    await scheduler.waitForIdle();
  };

  const clearRemoteDraft = async () => {
    let lastNotFoundError: unknown;

    for (let reconciliationAttempt = 0; reconciliationAttempt < 2; reconciliationAttempt += 1) {
      const response = await getFlowDraftRequest();
      const currentDraft = response.data;
      if (!currentDraft) return;

      try {
        await deleteFlowDraftRequest(currentDraft.id);
        return;
      } catch (error) {
        if (getErrorStatus(error) !== 404) throw error;
        lastNotFoundError = error;
      }
    }

    throw lastNotFoundError;
  };

  const clearDraft = async () => {
    invalidateInitialize();
    isClearing.value = true;
    status.value = 'clearing';
    errorMessage.value = '';
    scheduler.cancel();

    try {
      await scheduler.waitForIdle();

      if (canSync) {
        await clearRemoteDraft();
      }

      removeLocalFallback();
      resetState();
      scheduler.resume();
    } catch (error) {
      status.value = 'error';
      errorMessage.value = getErrorMessage(error) ?? '草稿清空失败，本地内容仍在';
      throw error;
    } finally {
      isClearing.value = false;
    }
  };

  const resetAfterPublication = async (): Promise<{ remoteCleared: boolean }> => {
    invalidateInitialize();
    isClearing.value = true;
    status.value = 'clearing';
    errorMessage.value = '';
    scheduler.cancel();

    try {
      await scheduler.waitForIdle();
      removeLocalFallback();
      resetState();
      scheduler.resume();

      if (!canSync) return { remoteCleared: true };

      try {
        await clearRemoteDraft();
        return { remoteCleared: true };
      } catch {
        return { remoteCleared: false };
      }
    } finally {
      isClearing.value = false;
    }
  };

  const statusText = computed(() => {
    const labels: Record<FlowDraftAutosaveStatus, string> = {
      idle: '',
      hydrating: '正在恢复草稿…',
      local: '已保存在本机',
      dirty: '等待保存',
      saving: '保存中…',
      saved: '已保存',
      error: '保存失败，本地草稿仍在',
      conflict: '草稿有冲突，本地内容仍在',
      clearing: '正在清空…',
    };
    return labels[status.value];
  });

  const hasDraft = computed(() => hasLocalFallback.value || draftId.value !== null || hasMeaningfulFlowDraft(latestSnapshot.value));
  const isSaving = computed(() => status.value === 'saving' || mutation.isPending.value);

  onBeforeUnmount(() => {
    invalidateInitialize();
    scheduler.dispose();
  });

  return {
    status: readonly(status),
    statusText,
    errorMessage: readonly(errorMessage),
    draftId: readonly(draftId),
    version: readonly(version),
    lastSavedAt: readonly(lastSavedAt),
    isHydrating: readonly(isHydrating),
    isClearing: readonly(isClearing),
    hasDraft,
    isSaving,
    initialize,
    recordSnapshot,
    flushPendingSave,
    clearDraft,
    resetAfterPublication,
  };
}
