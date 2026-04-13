import { computed, onBeforeUnmount, readonly, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';

import { deleteDraftRequest, getDraftByArticleIdRequest, getDraftRequest, saveDraftRequest } from '@/service/draft/draft.request';
import type { DraftRecord, SaveDraftPayload, TiptapDocContent } from '@/service/draft/draft.types';

export type DraftAutosaveStatus = 'idle' | 'hydrating' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface DraftSnapshotInput {
  articleId: number | null;
  title: string | null;
  content: TiptapDocContent;
  meta: SaveDraftPayload['meta'];
}

type SchedulerErrorAction = 'continue' | 'halt';

interface DraftSaveSchedulerOptions<TSnapshot, TResult> {
  debounceMs?: number;
  save: (snapshot: TSnapshot) => Promise<TResult>;
  onDirty?: (snapshot: TSnapshot) => void;
  onSaving?: (snapshot: TSnapshot) => void;
  onSaved?: (result: TResult, snapshot: TSnapshot) => void;
  onError?: (error: unknown, snapshot: TSnapshot) => SchedulerErrorAction | void;
}

export function createDraftSaveScheduler<TSnapshot, TResult>(options: DraftSaveSchedulerOptions<TSnapshot, TResult>) {
  const { debounceMs = 1200, save, onDirty, onSaving, onSaved, onError } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let queuedSnapshot: TSnapshot | null = null;
  let isInFlight = false;
  let isHalted = false;
  let isDisposed = false;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = async () => {
    clearTimer();

    if (isDisposed || isHalted || isInFlight || !queuedSnapshot) {
      return;
    }

    const snapshot = queuedSnapshot;
    queuedSnapshot = null;
    isInFlight = true;
    onSaving?.(snapshot);

    try {
      const result = await save(snapshot);
      if (!isDisposed) {
        onSaved?.(result, snapshot);
      }
    } catch (error) {
      if (!isDisposed) {
        const action = onError?.(error, snapshot) ?? 'continue';
        if (action === 'halt') {
          isHalted = true;
          queuedSnapshot = null;
        }
      }
    } finally {
      isInFlight = false;
    }

    if (!isDisposed && !isHalted && queuedSnapshot) {
      void flush();
    }
  };

  const schedule = (snapshot: TSnapshot) => {
    if (isDisposed || isHalted) {
      return;
    }

    queuedSnapshot = snapshot;
    onDirty?.(snapshot);
    clearTimer();
    timer = setTimeout(() => {
      void flush();
    }, debounceMs);
  };

  const cancel = () => {
    clearTimer();
    queuedSnapshot = null;
  };

  const dispose = () => {
    isDisposed = true;
    cancel();
  };

  return {
    schedule,
    flush,
    cancel,
    dispose,
    isInFlight: () => isInFlight,
    isHalted: () => isHalted,
    hasQueuedSnapshot: () => queuedSnapshot !== null,
  };
}

const getErrorStatus = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    return (error as { response?: { status?: number } }).response?.status;
  }

  return undefined;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { msg?: string; message?: string } } }).response;
    return response?.data?.msg ?? response?.data?.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
};

export interface UseDraftAutosaveOptions {
  scopeId: string;
  articleId?: number | null;
  debounceMs?: number;
}

export function useDraftAutosave(options: UseDraftAutosaveOptions) {
  const status = ref<DraftAutosaveStatus>('idle');
  const errorMessage = ref('');
  const draftId = ref<number | null>(null);
  const version = ref(0);
  const lastSavedAt = ref<string | null>(null);
  const isHydrating = ref(false);

  const mutation = useMutation({
    mutationFn: async (payload: SaveDraftPayload) => {
      const response = await saveDraftRequest(payload);
      return response.data;
    },
    scope: {
      id: options.scopeId,
    },
  });

  const resetState = () => {
    draftId.value = null;
    version.value = 0;
    lastSavedAt.value = null;
    errorMessage.value = '';
    status.value = 'idle';
  };

  const hydrateFromDraft = (draft: DraftRecord | null) => {
    if (!draft) {
      resetState();
      return null;
    }

    draftId.value = draft.id;
    version.value = draft.version;
    lastSavedAt.value = draft.updateAt ?? draft.createAt ?? null;
    errorMessage.value = '';
    status.value = 'saved';
    return draft;
  };

  const scheduler = createDraftSaveScheduler<DraftSnapshotInput, DraftRecord>({
    debounceMs: options.debounceMs,
    save: (snapshot) =>
      mutation.mutateAsync({
        ...snapshot,
        version: version.value,
      }),
    onDirty: () => {
      if (status.value !== 'conflict' && !isHydrating.value) {
        status.value = 'dirty';
        errorMessage.value = '';
      }
    },
    onSaving: () => {
      status.value = 'saving';
    },
    onSaved: (draft) => {
      draftId.value = draft.id;
      version.value = draft.version;
      lastSavedAt.value = draft.updateAt ?? new Date().toISOString();
      errorMessage.value = '';
      status.value = 'saved';
    },
    onError: (error) => {
      const statusCode = getErrorStatus(error);
      if (statusCode === 409) {
        status.value = 'conflict';
        errorMessage.value = getErrorMessage(error) ?? '草稿冲突，请刷新页面后重试';
        return 'halt';
      }

      status.value = 'error';
      errorMessage.value = getErrorMessage(error) ?? '草稿保存失败';
      return 'continue';
    },
  });

  const scheduleSave = (snapshot: DraftSnapshotInput) => {
    if (isHydrating.value || status.value === 'conflict') {
      return;
    }

    scheduler.schedule(snapshot);
  };

  const flushPendingSave = async () => {
    await scheduler.flush();
  };

  const loadDraft = async () => {
    isHydrating.value = true;
    status.value = 'hydrating';

    try {
      const response = options.articleId ? await getDraftByArticleIdRequest(options.articleId) : await getDraftRequest();
      return hydrateFromDraft(response.data);
    } finally {
      isHydrating.value = false;
      if (status.value === 'hydrating') {
        status.value = draftId.value ? 'saved' : 'idle';
      }
    }
  };

  const clearDraft = async () => {
    scheduler.cancel();

    if (draftId.value) {
      await deleteDraftRequest(draftId.value);
    }

    resetState();
  };

  const markConflict = (message = '草稿冲突，请刷新页面后重试') => {
    status.value = 'conflict';
    errorMessage.value = message;
  };

  const setHydrating = (value: boolean) => {
    isHydrating.value = value;
  };

  onBeforeUnmount(() => {
    scheduler.dispose();
  });

  return {
    status: readonly(status),
    errorMessage: readonly(errorMessage),
    draftId: readonly(draftId),
    version: readonly(version),
    lastSavedAt: readonly(lastSavedAt),
    isHydrating: readonly(isHydrating),
    isSaving: computed(() => status.value === 'saving' || mutation.isPending.value),
    hasUnsavedChanges: computed(() => ['dirty', 'saving', 'error', 'conflict'].includes(status.value)),
    scheduleSave,
    flushPendingSave,
    loadDraft,
    clearDraft,
    hydrateFromDraft,
    markConflict,
    setHydrating,
    cancelPendingSave: scheduler.cancel,
    resetState,
  };
}
