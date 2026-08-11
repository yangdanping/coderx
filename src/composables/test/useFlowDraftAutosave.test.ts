import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { defineComponent } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlowDraftLocalFallback, FlowDraftRecord, FlowDraftSnapshot } from '@/service/flow/flow-draft.types';

const { deleteFlowDraftRequestMock, getFlowDraftRequestMock, saveFlowDraftRequestMock } = vi.hoisted(() => ({
  deleteFlowDraftRequestMock: vi.fn(),
  getFlowDraftRequestMock: vi.fn(),
  saveFlowDraftRequestMock: vi.fn(),
}));

vi.mock('@/service/flow/flow-draft.request', () => ({
  deleteFlowDraftRequest: deleteFlowDraftRequestMock,
  getFlowDraftRequest: getFlowDraftRequestMock,
  saveFlowDraftRequest: saveFlowDraftRequestMock,
}));

import { getFlowDraftLocalStorageKey, resolveFlowDraftRestore, useFlowDraftAutosave, type UseFlowDraftAutosaveOptions } from '../useFlowDraftAutosave';

const wrappers: VueWrapper[] = [];

const emptySnapshot = (): FlowDraftSnapshot => ({
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  meta: { imageIds: [], videoIds: [] },
});

const textSnapshot = (text: string): FlowDraftSnapshot => ({
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  },
  meta: { imageIds: [], videoIds: [] },
});

const remoteDraft = (overrides: Partial<FlowDraftRecord> = {}): FlowDraftRecord => ({
  id: 18,
  userId: 7,
  draftType: 'flow',
  articleId: null,
  title: null,
  content: textSnapshot('服务端').content,
  meta: { imageIds: [], videoIds: [] },
  version: 4,
  createAt: '2026-08-11T02:00:00.000Z',
  updateAt: '2026-08-11T02:00:00.000Z',
  ...overrides,
});

function mountAutosave(options: UseFlowDraftAutosaveOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, gcTime: Infinity },
    },
  });
  let autosave!: ReturnType<typeof useFlowDraftAutosave>;

  const Harness = defineComponent({
    setup() {
      autosave = useFlowDraftAutosave(options);
      return () => null;
    },
  });

  const wrapper = mount(Harness, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
    },
  });
  wrappers.push(wrapper);

  return autosave;
}

beforeEach(() => {
  window.localStorage.clear();
  deleteFlowDraftRequestMock.mockReset();
  getFlowDraftRequestMock.mockReset();
  saveFlowDraftRequestMock.mockReset();
  getFlowDraftRequestMock.mockResolvedValue({ data: null });
  deleteFlowDraftRequestMock.mockResolvedValue({ data: { id: 18 } });
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

describe('Flow draft restore helpers', () => {
  it('scopes local fallbacks by authenticated user or guest actor', () => {
    expect(getFlowDraftLocalStorageKey(7)).toBe('coderx_flow_draft_v1:user:7');
    expect(getFlowDraftLocalStorageKey(null)).toBe('coderx_flow_draft_v1:guest');
  });

  it('prefers a newer unsent local snapshot and otherwise uses the server snapshot', () => {
    const local: FlowDraftLocalFallback = {
      schemaVersion: 1,
      actorKey: 'user:7',
      ...textSnapshot('本地'),
      draftId: 18,
      version: 4,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:01:00.000Z',
    };
    const remote = remoteDraft();

    expect(resolveFlowDraftRestore(local, remote).source).toBe('local');
    expect(
      resolveFlowDraftRestore(
        {
          ...local,
          localUpdatedAt: '2026-08-11T01:59:00.000Z',
        },
        remote,
      ).source,
    ).toBe('remote');
  });
});

describe('useFlowDraftAutosave', () => {
  it('does not let a slow initialize overwrite an edit recorded after restore started', async () => {
    let resolveInitialize!: (value: { data: FlowDraftRecord }) => void;
    getFlowDraftRequestMock.mockImplementation(
      () =>
        new Promise<{ data: FlowDraftRecord }>((resolve) => {
          resolveInitialize = resolve;
        }),
    );
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 60_000 });

    const initializePromise = autosave.initialize();
    await flushPromises();
    autosave.recordSnapshot(textSnapshot('请求期间的新输入'));
    resolveInitialize({ data: remoteDraft({ content: textSnapshot('较旧的服务端草稿').content }) });

    expect(await initializePromise).toBeNull();
    const cached = JSON.parse(window.localStorage.getItem(getFlowDraftLocalStorageKey(7)) ?? 'null') as FlowDraftLocalFallback;
    expect(cached.content).toEqual(textSnapshot('请求期间的新输入').content);
    expect(autosave.status.value).toBe('dirty');
  });

  it('keeps cached identity when initialize fails after a newer local edit', async () => {
    vi.useFakeTimers();
    let rejectInitialize!: (reason: unknown) => void;
    const local: FlowDraftLocalFallback = {
      schemaVersion: 1,
      actorKey: 'user:7',
      ...textSnapshot('初始化前的本地内容'),
      draftId: 18,
      version: 4,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:05:00.000Z',
    };
    window.localStorage.setItem(getFlowDraftLocalStorageKey(7), JSON.stringify(local));
    getFlowDraftRequestMock.mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectInitialize = reject;
        }),
    );
    saveFlowDraftRequestMock.mockResolvedValue({
      data: remoteDraft({ version: 5, content: textSnapshot('网络恢复后的输入').content }),
    });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 100 });

    const initializePromise = autosave.initialize();
    await flushPromises();
    autosave.recordSnapshot(textSnapshot('请求期间的新输入'));

    const cachedDuringInitialize = JSON.parse(window.localStorage.getItem(getFlowDraftLocalStorageKey(7)) ?? 'null') as FlowDraftLocalFallback;
    expect(cachedDuringInitialize).toMatchObject({
      draftId: 18,
      version: 4,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      content: textSnapshot('请求期间的新输入').content,
    });

    rejectInitialize(new Error('network unavailable'));
    expect(await initializePromise).toBeNull();
    autosave.recordSnapshot(textSnapshot('网络恢复后的输入'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(saveFlowDraftRequestMock).toHaveBeenCalledWith({
      ...textSnapshot('网络恢复后的输入'),
      version: 4,
    });
  });

  it('writes locally immediately and sends only the latest rapid edit after the debounce', async () => {
    vi.useFakeTimers();
    saveFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ version: 1, content: textSnapshot('最终').content }) });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 1200 });
    await autosave.initialize();

    autosave.recordSnapshot(textSnapshot('第一次'));
    autosave.recordSnapshot(textSnapshot('最终'));

    const cached = JSON.parse(window.localStorage.getItem(getFlowDraftLocalStorageKey(7)) ?? 'null') as FlowDraftLocalFallback;
    expect(cached.content).toEqual(textSnapshot('最终').content);
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1199);
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(saveFlowDraftRequestMock).toHaveBeenCalledTimes(1);
    expect(saveFlowDraftRequestMock).toHaveBeenCalledWith({
      ...textSnapshot('最终'),
      version: 0,
    });
    expect(autosave.status.value).toBe('saved');
  });

  it('restores a newer local edit and resaves it with the current server version', async () => {
    vi.useFakeTimers();
    const local: FlowDraftLocalFallback = {
      schemaVersion: 1,
      actorKey: 'user:7',
      ...textSnapshot('断网时继续写'),
      draftId: 18,
      version: 3,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:05:00.000Z',
    };
    window.localStorage.setItem(getFlowDraftLocalStorageKey(7), JSON.stringify(local));
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ version: 4 }) });
    saveFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ version: 5, content: local.content }) });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 1200 });

    const restored = await autosave.initialize();
    expect(restored?.content).toEqual(local.content);

    await vi.advanceTimersByTimeAsync(1200);
    await flushPromises();
    expect(saveFlowDraftRequestMock).toHaveBeenCalledWith({
      content: local.content,
      meta: local.meta,
      version: 4,
    });
  });

  it('keeps a guest draft local without calling protected endpoints', async () => {
    const autosave = mountAutosave({ userId: null, canSync: false });

    expect(await autosave.initialize()).toBeNull();
    autosave.recordSnapshot(textSnapshot('游客本地草稿'));

    expect(getFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(autosave.status.value).toBe('local');
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(null))).not.toBeNull();
  });

  it('halts server writes on a version conflict while preserving the local fallback', async () => {
    vi.useFakeTimers();
    saveFlowDraftRequestMock.mockRejectedValue({ response: { status: 409, data: { msg: '草稿版本冲突' } } });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 100 });
    await autosave.initialize();

    autosave.recordSnapshot(textSnapshot('冲突内容'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(autosave.status.value).toBe('conflict');

    autosave.recordSnapshot(textSnapshot('冲突后继续输入'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(saveFlowDraftRequestMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).not.toBeNull();
  });

  it('waits for the first in-flight creation before deleting the returned draft id', async () => {
    let resolveSave!: (value: { data: FlowDraftRecord }) => void;
    saveFlowDraftRequestMock.mockImplementation(
      () =>
        new Promise<{ data: FlowDraftRecord }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    getFlowDraftRequestMock.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: remoteDraft({ id: 18, version: 1 }) });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 1200 });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('正在首次保存'));

    const flushPromise = autosave.flushPendingSave();
    await flushPromises();
    const clearPromise = autosave.clearDraft();
    await flushPromises();
    expect(deleteFlowDraftRequestMock).not.toHaveBeenCalled();

    resolveSave({ data: remoteDraft({ version: 1, content: textSnapshot('正在首次保存').content }) });
    await flushPromise;
    await clearPromise;

    expect(deleteFlowDraftRequestMock).toHaveBeenCalledWith(18);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
    expect(autosave.hasDraft.value).toBe(false);
    expect(autosave.status.value).toBe('idle');
  });

  it('rejects editor snapshots while an explicit clear is in progress', async () => {
    let resolveDelete!: (value: { data: { id: number } }) => void;
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    deleteFlowDraftRequestMock.mockImplementation(
      () =>
        new Promise<{ data: { id: number } }>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 60_000 });
    await autosave.initialize();

    const clearPromise = autosave.clearDraft();
    await flushPromises();
    const accepted = autosave.recordSnapshot(textSnapshot('清空期间不应被接受'));

    expect(accepted).toBe(false);
    const cachedDuringClear = JSON.parse(window.localStorage.getItem(getFlowDraftLocalStorageKey(7)) ?? 'null') as FlowDraftLocalFallback;
    expect(cachedDuringClear.content).toEqual(textSnapshot('服务端').content);
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();

    resolveDelete({ data: { id: 18 } });
    await clearPromise;
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
  });

  it('resumes remote synchronization after a conflict is explicitly cleared', async () => {
    vi.useFakeTimers();
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    saveFlowDraftRequestMock
      .mockRejectedValueOnce({ response: { status: 409, data: { msg: '草稿版本冲突' } } })
      .mockResolvedValueOnce({ data: remoteDraft({ version: 1, content: textSnapshot('重新开始').content }) });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 100 });
    await autosave.initialize();

    autosave.recordSnapshot(textSnapshot('产生冲突'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(autosave.status.value).toBe('conflict');

    await autosave.clearDraft();
    autosave.recordSnapshot(textSnapshot('重新开始'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(saveFlowDraftRequestMock).toHaveBeenCalledTimes(2);
    expect(saveFlowDraftRequestMock).toHaveBeenLastCalledWith({
      ...textSnapshot('重新开始'),
      version: 0,
    });
    expect(autosave.status.value).toBe('saved');
  });

  it('resolves an unknown conflicted draft id before clearing remotely', async () => {
    vi.useFakeTimers();
    getFlowDraftRequestMock.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: remoteDraft({ id: 31, version: 6 }) });
    saveFlowDraftRequestMock.mockRejectedValueOnce({ response: { status: 409, data: { msg: '草稿版本冲突' } } });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 100 });
    await autosave.initialize();

    autosave.recordSnapshot(textSnapshot('未知身份冲突'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(autosave.status.value).toBe('conflict');
    expect(autosave.draftId.value).toBeNull();

    await autosave.clearDraft();

    expect(getFlowDraftRequestMock).toHaveBeenCalledTimes(2);
    expect(deleteFlowDraftRequestMock).toHaveBeenCalledWith(31);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
  });

  it('reconciles a stale cached id after delete returns 404', async () => {
    getFlowDraftRequestMock
      .mockResolvedValueOnce({ data: remoteDraft({ id: 18 }) })
      .mockResolvedValueOnce({ data: remoteDraft({ id: 18 }) })
      .mockResolvedValueOnce({ data: remoteDraft({ id: 27, version: 7 }) });
    deleteFlowDraftRequestMock.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: { id: 27 } });
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();

    await autosave.clearDraft();

    expect(deleteFlowDraftRequestMock.mock.calls).toEqual([[18], [27]]);
    expect(getFlowDraftRequestMock).toHaveBeenCalledTimes(3);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
  });

  it('preserves the local fallback and halted scheduler when remote reconciliation fails', async () => {
    vi.useFakeTimers();
    getFlowDraftRequestMock.mockResolvedValueOnce({ data: null }).mockRejectedValueOnce(new Error('network unavailable'));
    saveFlowDraftRequestMock.mockRejectedValueOnce({ response: { status: 409, data: { msg: '草稿版本冲突' } } });
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 100 });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('必须保留的冲突内容'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    await expect(autosave.clearDraft()).rejects.toThrow('network unavailable');
    expect(autosave.status.value).toBe('error');
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).not.toBeNull();

    autosave.recordSnapshot(textSnapshot('失败后继续本地输入'));
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(saveFlowDraftRequestMock).toHaveBeenCalledTimes(1);
  });

  it('preserves the local fallback when the remote delete fails', async () => {
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    deleteFlowDraftRequestMock.mockRejectedValue(new Error('delete unavailable'));
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();

    await expect(autosave.clearDraft()).rejects.toThrow('delete unavailable');

    expect(autosave.status.value).toBe('error');
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).not.toBeNull();
  });

  it('drops an untouched empty local-only snapshot instead of creating a draft', async () => {
    const autosave = mountAutosave({ userId: null, canSync: false });
    await autosave.initialize();

    autosave.recordSnapshot(emptySnapshot());

    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(null))).toBeNull();
    expect(autosave.hasDraft.value).toBe(false);
  });

  it('persists the current ordered uploaded image ids in draft metadata', async () => {
    const autosave = mountAutosave({ userId: null, canSync: false });
    await autosave.initialize();

    autosave.recordSnapshot({
      ...textSnapshot('带图草稿'),
      meta: { imageIds: [42, 41], videoIds: [] },
    });

    const cached = JSON.parse(window.localStorage.getItem(getFlowDraftLocalStorageKey(null)) ?? 'null') as FlowDraftLocalFallback;
    expect(cached.meta.imageIds).toEqual([42, 41]);
  });

  it('publication reset waits stale saves, clears local state, and treats remote cleanup as best effort', async () => {
    let resolveSave!: (value: { data: FlowDraftRecord }) => void;
    saveFlowDraftRequestMock.mockImplementation(
      () =>
        new Promise<{ data: FlowDraftRecord }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    getFlowDraftRequestMock.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: remoteDraft({ id: 33, version: 1 }) });
    deleteFlowDraftRequestMock.mockRejectedValue(new Error('remote cleanup unavailable'));
    const autosave = mountAutosave({ userId: 7, canSync: true, debounceMs: 60_000 });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('已经发布的内容'));

    const flushPromise = autosave.flushPendingSave();
    await flushPromises();
    const resetPromise = autosave.resetAfterPublication();
    await flushPromises();
    expect(autosave.recordSnapshot(textSnapshot('重置期间的旧编辑器事件'))).toBe(false);

    resolveSave({ data: remoteDraft({ id: 33, version: 1, content: textSnapshot('已经发布的内容').content }) });
    await flushPromise;
    await expect(resetPromise).resolves.toEqual({ remoteCleared: false });

    expect(deleteFlowDraftRequestMock).toHaveBeenCalledWith(33);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
    expect(autosave.hasDraft.value).toBe(false);
    expect(autosave.status.value).toBe('idle');
  });
});
