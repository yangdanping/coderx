import { computed, onBeforeUnmount, readonly, shallowRef } from 'vue';
import { useMutation } from '@tanstack/vue-query';

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
  /** Kept for call-site compatibility; Flow persistence is now explicit. */
  debounceMs?: number;
}

export interface FlowDraftRestoreResolution {
  source: 'local' | 'remote' | 'empty';
  snapshot: FlowDraftSnapshot | null;
  state: FlowDraftRestoreState | null;
}

type SavedBaselineStatus = 'idle' | 'local' | 'saved';

const FLOW_DRAFT_CACHE_PREFIX = 'coderx_flow_draft_v1';
const FLOW_DRAFT_SCHEMA_VERSION = 2;

const createEmptyFlowDocument = (): TiptapDocContent => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

const createEmptyFlowSnapshot = (): FlowDraftSnapshot => ({
  content: createEmptyFlowDocument(),
  meta: { imageIds: [], videoIds: [] },
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

const cloneFlowDraftSnapshot = (snapshot: FlowDraftSnapshot): FlowDraftSnapshot =>
  JSON.parse(JSON.stringify(normalizeFlowDraftSnapshot(snapshot))) as FlowDraftSnapshot;

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
  return { ...cloneFlowDraftSnapshot(normalizedSnapshot), ...selectedImages, images: selectedImages.images.map((image) => ({ ...image })) };
};

const incompleteImagesMessage = '部分图片未能恢复，请重新上传缺失图片后再保存草稿';

const nodeHasMeaningfulText = (node: TiptapDocContent | undefined): boolean => {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'text') return typeof node.text === 'string' && node.text.trim().length > 0;
  return node.content?.some((child) => nodeHasMeaningfulText(child)) ?? false;
};

export const hasMeaningfulFlowDraft = (snapshot: FlowDraftSnapshot | null): boolean => {
  if (!snapshot) return false;
  return nodeHasMeaningfulText(snapshot.content) || snapshot.meta.imageIds.length > 0 || snapshot.meta.videoIds.length > 0;
};

const snapshotKey = (snapshot: FlowDraftSnapshot | null): string => JSON.stringify(normalizeFlowDraftSnapshot(snapshot ?? createEmptyFlowSnapshot()));

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
    return { source: 'remote', snapshot, state: createRestoreState(snapshot, remote.images) };
  }

  if (local) {
    const snapshot = normalizeFlowDraftSnapshot(local);
    return { source: 'local', snapshot, state: createRestoreState(snapshot, local.schemaVersion === 2 ? local.images : undefined) };
  }

  if (remote) {
    const snapshot = normalizeFlowDraftSnapshot({ content: remote.content, meta: remote.meta });
    return { source: 'remote', snapshot, state: createRestoreState(snapshot, remote.images) };
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
  const savedSnapshot = shallowRef<FlowDraftSnapshot | null>(null);
  const savedImages = shallowRef<FlowImageAsset[]>([]);
  const savedBaselineStatus = shallowRef<SavedBaselineStatus>('idle');
  const hasLocalFallback = shallowRef(false);
  const isHydrating = shallowRef(false);
  const isClearing = shallowRef(false);
  const isRecoveryBlocked = shallowRef(false);

  let lifecycleGeneration = 0;
  let editRevision = 0;

  const mutation = useMutation({
    mutationFn: async (snapshot: FlowDraftSnapshot) => {
      const response = await saveFlowDraftRequest({
        content: snapshot.content,
        meta: snapshot.meta,
        version: version.value,
      });
      return response.data;
    },
    scope: { id: `flow-draft:${actorKey}` },
  });

  const isSaving = computed(() => status.value === 'saving' || mutation.isPending.value);
  const hasContent = computed(() => hasMeaningfulFlowDraft(latestSnapshot.value));
  const isDirty = computed(() => snapshotKey(latestSnapshot.value) !== snapshotKey(savedSnapshot.value));
  const canSave = computed(
    () =>
      hasContent.value &&
      isDirty.value &&
      latestImagesComplete.value &&
      !isHydrating.value &&
      !isClearing.value &&
      !isSaving.value &&
      status.value !== 'conflict',
  );
  const savedMediaIds = computed<readonly number[]>(() => Object.freeze([...(savedSnapshot.value?.meta.imageIds ?? [])]));
  const hasDraft = computed(() => hasLocalFallback.value || draftId.value !== null || hasMeaningfulFlowDraft(savedSnapshot.value));

  const invalidateInitialize = () => {
    lifecycleGeneration += 1;
    isHydrating.value = false;
  };

  const removeLocalFallback = () => {
    LocalCache.removeCache(localStorageKey);
    hasLocalFallback.value = false;
    isRecoveryBlocked.value = false;
  };

  const writeLocalFallback = (
    snapshot: FlowDraftSnapshot,
    images: readonly FlowImageAsset[],
    timestamps: { localUpdatedAt?: string; serverUpdatedAt?: string | null } = {},
  ) => {
    const normalizedSnapshot = normalizeFlowDraftSnapshot(snapshot);
    const selectedImages = selectFlowDraftImages(normalizedSnapshot.meta.imageIds, images);
    const localUpdatedAt = timestamps.localUpdatedAt ?? new Date().toISOString();
    const serverUpdatedAt = timestamps.serverUpdatedAt === undefined ? lastSavedAt.value : timestamps.serverUpdatedAt;
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

    const schemaVersion = cached['schemaVersion'];
    const cachedDraftId = cached['draftId'];
    const cachedVersion = cached['version'];
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
  };

  const setSavedBaseline = (state: FlowDraftRestoreState | null, baselineStatus: SavedBaselineStatus) => {
    savedSnapshot.value = state ? cloneFlowDraftSnapshot(state) : null;
    savedImages.value = state ? state.images.map((image) => ({ ...image })) : [];
    savedBaselineStatus.value = state ? baselineStatus : 'idle';
  };

  const applyCurrentState = (state: FlowDraftRestoreState | null) => {
    latestSnapshot.value = state ? cloneFlowDraftSnapshot(state) : null;
    latestImages.value = state ? state.images.map((image) => ({ ...image })) : [];
    latestImagesComplete.value = state?.imagesComplete ?? true;
  };

  const restoreStableStatus = () => {
    if (!latestImagesComplete.value) {
      status.value = 'error';
      errorMessage.value = incompleteImagesMessage;
    } else if (isDirty.value) {
      status.value = 'dirty';
      errorMessage.value = '';
    } else {
      status.value = savedBaselineStatus.value;
      errorMessage.value = '';
    }
  };

  const resetState = () => {
    draftId.value = null;
    version.value = 0;
    lastSavedAt.value = null;
    latestSnapshot.value = null;
    latestImages.value = [];
    latestImagesComplete.value = true;
    savedSnapshot.value = null;
    savedImages.value = [];
    savedBaselineStatus.value = 'idle';
    hasLocalFallback.value = false;
    errorMessage.value = '';
    status.value = 'idle';
    editRevision += 1;
  };

  const initialize = async (): Promise<FlowDraftRestoreState | null> => {
    const initializeGeneration = lifecycleGeneration;
    const revisionAtStart = editRevision;
    isHydrating.value = true;
    status.value = 'hydrating';
    errorMessage.value = '';

    const local = readLocalFallback();
    let remote: FlowDraftRecord | null = null;
    let restoredState: FlowDraftRestoreState | null = null;

    try {
      if (canSync) {
        remote = (await getFlowDraftRequest()).data;
        if (lifecycleGeneration !== initializeGeneration) return null;
        isRecoveryBlocked.value = false;
      } else {
        isRecoveryBlocked.value = false;
      }

      if (remote) {
        hydrateFromRemote(remote);
      } else if (!canSync && local) {
        hydrateFromLocal(local);
      } else if (canSync) {
        draftId.value = null;
        version.value = 0;
        lastSavedAt.value = null;
      }

      const resolution = resolveFlowDraftRestore(local, remote);
      restoredState = resolution.state;

      if (canSync && remote) {
        const remoteSnapshot = normalizeFlowDraftSnapshot({ content: remote.content, meta: remote.meta });
        setSavedBaseline(createRestoreState(remoteSnapshot, remote.images), 'saved');
      } else if (!canSync && local && restoredState) {
        setSavedBaseline(restoredState, 'local');
      } else {
        setSavedBaseline(null, 'idle');
      }

      if (editRevision === revisionAtStart) {
        applyCurrentState(restoredState);
      } else {
        restoredState = null;
      }

      if (resolution.source === 'remote' && remote && resolution.state) {
        const serverUpdatedAt = remote.updateAt ?? remote.createAt ?? new Date().toISOString();
        try {
          writeLocalFallback(resolution.state, resolution.state.images, {
            localUpdatedAt: serverUpdatedAt,
            serverUpdatedAt,
          });
        } catch {
          // The remote draft is authoritative; cache failure must not make
          // successfully reconciled remote state unsafe.
        }
      }

      restoreStableStatus();
      return restoredState;
    } catch (error) {
      if (lifecycleGeneration !== initializeGeneration) return null;
      isRecoveryBlocked.value = canSync;
      if (local) {
        hydrateFromLocal(local);
        const localState = createRestoreState(normalizeFlowDraftSnapshot(local), local.schemaVersion === 2 ? local.images : undefined);
        setSavedBaseline(localState, canSync ? 'saved' : 'local');
        if (editRevision === revisionAtStart) applyCurrentState(localState);
        restoredState = editRevision === revisionAtStart ? localState : null;
      }
      status.value = 'error';
      errorMessage.value = getErrorMessage(error) ?? '草稿恢复失败';
      return restoredState;
    } finally {
      if (lifecycleGeneration === initializeGeneration) isHydrating.value = false;
    }
  };

  const recordSnapshot = (snapshot: FlowDraftSnapshot, uploadedAssets: readonly FlowImageAsset[] = []) => {
    if (isClearing.value) return false;
    latestSnapshot.value = normalizeFlowDraftSnapshot(snapshot);
    const selectedImages = selectFlowDraftImages(latestSnapshot.value.meta.imageIds, uploadedAssets);
    latestImages.value = selectedImages.images;
    latestImagesComplete.value = selectedImages.imagesComplete;
    editRevision += 1;

    if (!selectedImages.imagesComplete) {
      status.value = 'error';
      errorMessage.value = incompleteImagesMessage;
    } else if (status.value !== 'conflict') {
      restoreStableStatus();
    }
    return true;
  };

  const saveDraft = async (): Promise<FlowDraftRestoreState> => {
    if (isHydrating.value || isClearing.value || isSaving.value || status.value === 'conflict') {
      throw new Error(errorMessage.value || 'Flow 草稿当前不可保存');
    }
    if (!latestSnapshot.value || !hasMeaningfulFlowDraft(latestSnapshot.value)) {
      throw new Error('Flow 草稿没有可保存的内容');
    }

    const snapshotToSave = cloneFlowDraftSnapshot(latestSnapshot.value);
    const selectedImages = selectFlowDraftImages(snapshotToSave.meta.imageIds, latestImages.value);
    if (!selectedImages.imagesComplete) {
      latestImagesComplete.value = false;
      status.value = 'error';
      errorMessage.value = incompleteImagesMessage;
      throw new Error(incompleteImagesMessage);
    }

    const revisionToSave = editRevision;
    status.value = 'saving';
    errorMessage.value = '';

    try {
      let serverUpdatedAt: string | null = null;
      if (canSync) {
        const draft = await mutation.mutateAsync(snapshotToSave);
        hydrateFromRemote(draft);
        serverUpdatedAt = draft.updateAt ?? draft.createAt ?? new Date().toISOString();
        isRecoveryBlocked.value = false;
      } else {
        lastSavedAt.value = new Date().toISOString();
      }

      const savedState = createRestoreState(snapshotToSave, selectedImages.images);
      const fallbackTimestamps = {
        localUpdatedAt: serverUpdatedAt ?? lastSavedAt.value ?? new Date().toISOString(),
        serverUpdatedAt: serverUpdatedAt ?? lastSavedAt.value,
      };
      let cacheWriteFailed = false;
      if (canSync) {
        try {
          writeLocalFallback(snapshotToSave, selectedImages.images, fallbackTimestamps);
        } catch {
          cacheWriteFailed = true;
        }
      } else {
        // Local persistence is the durable save for guests, so it must succeed
        // before the in-memory saved baseline advances.
        writeLocalFallback(snapshotToSave, selectedImages.images, fallbackTimestamps);
      }

      setSavedBaseline(savedState, canSync ? 'saved' : 'local');

      if (editRevision === revisionToSave) {
        applyCurrentState(savedState);
      }
      restoreStableStatus();
      if (cacheWriteFailed) {
        errorMessage.value = '草稿已保存到服务器，但本地缓存写入失败';
      }
      return createRestoreState(snapshotToSave, selectedImages.images);
    } catch (error) {
      status.value = getErrorStatus(error) === 409 ? 'conflict' : 'error';
      if (getErrorStatus(error) === 409) isRecoveryBlocked.value = true;
      errorMessage.value = getErrorMessage(error) ?? 'Flow 草稿保存失败';
      throw error;
    }
  };

  const restoreSavedBaseline = (): FlowDraftRestoreState | null => {
    if (!savedSnapshot.value) {
      applyCurrentState(null);
      status.value = 'idle';
      errorMessage.value = '';
      editRevision += 1;
      return null;
    }

    const state = createRestoreState(savedSnapshot.value, savedImages.value);
    applyCurrentState(state);
    status.value = savedBaselineStatus.value;
    errorMessage.value = '';
    editRevision += 1;
    return createRestoreState(savedSnapshot.value, savedImages.value);
  };

  const clearRemoteDraft = async () => {
    let lastNotFoundError: unknown;
    for (let reconciliationAttempt = 0; reconciliationAttempt < 2; reconciliationAttempt += 1) {
      const currentDraft = (await getFlowDraftRequest()).data;
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
    try {
      if (canSync) await clearRemoteDraft();
      removeLocalFallback();
      resetState();
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
    const currentDraftId = draftId.value;
    removeLocalFallback();
    resetState();

    try {
      if (!canSync) return { remoteCleared: true };
      try {
        if (currentDraftId !== null) {
          await deleteFlowDraftRequest(currentDraftId);
        } else {
          await clearRemoteDraft();
        }
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
      dirty: '未保存',
      saving: '保存中…',
      saved: '已保存',
      error: '保存失败',
      conflict: '草稿有冲突',
      clearing: '正在清空…',
    };
    return labels[status.value];
  });

  onBeforeUnmount(invalidateInitialize);

  return {
    status: readonly(status),
    statusText,
    errorMessage: readonly(errorMessage),
    draftId: readonly(draftId),
    version: readonly(version),
    lastSavedAt: readonly(lastSavedAt),
    savedSnapshot: readonly(savedSnapshot),
    savedImages: readonly(savedImages),
    savedMediaIds,
    isHydrating: readonly(isHydrating),
    isClearing: readonly(isClearing),
    isRecoveryBlocked: readonly(isRecoveryBlocked),
    hasDraft,
    hasContent,
    isDirty,
    canSave,
    isSaving,
    initialize,
    recordSnapshot,
    saveDraft,
    restoreSavedBaseline,
    clearDraft,
    resetAfterPublication,
  };
}
