import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { defineComponent } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalCache } from '@/utils';

import type { FlowDraftLocalFallback, FlowDraftRecord, FlowDraftSnapshot } from '@/service/flow/flow-draft.types';
import type { FlowImageAsset } from '@/service/flow/flow.types';

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
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  },
  meta: { imageIds: [], videoIds: [] },
});

const imageAsset = (id: number): FlowImageAsset => ({
  id,
  url: `https://cdn.example.test/${id}.webp`,
  thumbnailUrl: `https://cdn.example.test/${id}-thumb.webp`,
  mimeType: 'image/webp',
  sizeBytes: 1024,
  width: 640,
  height: 480,
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
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  wrappers.push(wrapper);
  return autosave;
}

beforeEach(() => {
  window.localStorage.clear();
  deleteFlowDraftRequestMock.mockReset().mockResolvedValue({ data: { id: 18 } });
  getFlowDraftRequestMock.mockReset().mockResolvedValue({ data: null });
  saveFlowDraftRequestMock.mockReset();
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe('Flow draft restore helpers', () => {
  it('scopes local fallbacks by authenticated user or guest actor', () => {
    expect(getFlowDraftLocalStorageKey(7)).toBe('coderx_flow_draft_v1:user:7');
    expect(getFlowDraftLocalStorageKey(null)).toBe('coderx_flow_draft_v1:guest');
  });

  it('prefers a newer local snapshot and otherwise uses the server snapshot', () => {
    const local: FlowDraftLocalFallback = {
      schemaVersion: 1,
      actorKey: 'user:7',
      ...textSnapshot('本地'),
      draftId: 18,
      version: 4,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:01:00.000Z',
    };

    expect(resolveFlowDraftRestore(local, remoteDraft()).source).toBe('local');
    expect(resolveFlowDraftRestore({ ...local, localUpdatedAt: '2026-08-11T01:59:00.000Z' }, remoteDraft()).source).toBe('remote');
  });

  it('restores remote images in metadata order', async () => {
    getFlowDraftRequestMock.mockResolvedValue({
      data: remoteDraft({
        meta: { imageIds: [42, 41], videoIds: [] },
        images: [imageAsset(41), imageAsset(42)],
      }),
    });
    const autosave = mountAutosave({ userId: 7, canSync: true });

    const restored = await autosave.initialize();

    expect(restored?.images.map((image) => image.id)).toEqual([42, 41]);
    expect(restored?.imagesComplete).toBe(true);
  });

  it('uses schema-v2 local image descriptors when local content wins', async () => {
    const local: FlowDraftLocalFallback = {
      schemaVersion: 2,
      actorKey: 'user:7',
      ...textSnapshot('本地图片'),
      meta: { imageIds: [42, 41], videoIds: [] },
      images: [imageAsset(42), imageAsset(41)],
      draftId: 18,
      version: 4,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:01:00.000Z',
    };
    window.localStorage.setItem(getFlowDraftLocalStorageKey(7), JSON.stringify(local));
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ updateAt: '2026-08-11T01:00:00.000Z' }) });
    const autosave = mountAutosave({ userId: 7, canSync: true });

    const restored = await autosave.initialize();

    expect(restored?.images.map((image) => image.id)).toEqual([42, 41]);
    expect(restored?.imagesComplete).toBe(true);
  });

  it('reports incomplete schema-v1 recovery without dropping ids', async () => {
    const local: FlowDraftLocalFallback = {
      schemaVersion: 1,
      actorKey: 'user:7',
      ...textSnapshot('旧版本图片'),
      meta: { imageIds: [42, 41], videoIds: [] },
      draftId: 18,
      version: 4,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:01:00.000Z',
    };
    window.localStorage.setItem(getFlowDraftLocalStorageKey(7), JSON.stringify(local));
    getFlowDraftRequestMock.mockResolvedValue({
      data: remoteDraft({ updateAt: '2026-08-11T01:00:00.000Z', images: [imageAsset(41)] }),
    });
    const autosave = mountAutosave({ userId: 7, canSync: true });

    const restored = await autosave.initialize();

    expect(restored?.meta.imageIds).toEqual([42, 41]);
    expect(restored?.images.map((image) => image.id)).toEqual([41]);
    expect(restored?.imagesComplete).toBe(false);
    expect(autosave.errorMessage.value).toMatch(/图片/);
  });
});

describe('useFlowDraftAutosave explicit persistence', () => {
  it('keeps edits in memory until saveDraft is called', async () => {
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();

    autosave.recordSnapshot(textSnapshot('只在内存'));
    await flushPromises();

    expect(autosave.hasContent.value).toBe(true);
    expect(autosave.isDirty.value).toBe(true);
    expect(autosave.canSave.value).toBe(true);
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
  });

  it('persists only on explicit save and then advances the baseline', async () => {
    saveFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ content: textSnapshot('显式保存').content, version: 5 }) });
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('显式保存'));

    await autosave.saveDraft();

    expect(saveFlowDraftRequestMock).toHaveBeenCalledWith({ ...textSnapshot('显式保存'), version: 0 });
    expect(autosave.isDirty.value).toBe(false);
    expect(autosave.canSave.value).toBe(false);
    expect(autosave.restoreSavedBaseline()?.content).toEqual(textSnapshot('显式保存').content);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).not.toBeNull();
  });

  it('treats image-only snapshots as saveable and whitespace-only snapshots as empty', async () => {
    const autosave = mountAutosave({ userId: null, canSync: false });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('   '));
    expect(autosave.hasContent.value).toBe(false);
    expect(autosave.canSave.value).toBe(false);

    autosave.recordSnapshot({ ...emptySnapshot(), meta: { imageIds: [42], videoIds: [] } }, [imageAsset(42)]);

    expect(autosave.hasContent.value).toBe(true);
    expect(autosave.canSave.value).toBe(true);
  });

  it('saves guest drafts locally only after the explicit action', async () => {
    const autosave = mountAutosave({ userId: null, canSync: false });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('游客草稿'));

    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(null))).toBeNull();
    await autosave.saveDraft();

    expect(getFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(autosave.status.value).toBe('local');
    expect(autosave.isDirty.value).toBe(false);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(null))).not.toBeNull();
  });

  it('keeps a guest draft dirty when local persistence fails', async () => {
    const autosave = mountAutosave({ userId: null, canSync: false });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('本地写入失败'));
    const storageSpy = vi.spyOn(LocalCache, 'setCache').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await expect(autosave.saveDraft()).rejects.toThrow('quota exceeded');

    expect(autosave.savedSnapshot.value).toBeNull();
    expect(autosave.isDirty.value).toBe(true);
    expect(autosave.canSave.value).toBe(true);
    expect(autosave.status.value).toBe('error');
    storageSpy.mockRestore();
  });

  it('treats local cache failure as non-fatal after the server save succeeds', async () => {
    saveFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ content: textSnapshot('服务端已保存').content, version: 5 }) });
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('服务端已保存'));
    const storageSpy = vi.spyOn(LocalCache, 'setCache').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await expect(autosave.saveDraft()).resolves.toMatchObject({ content: textSnapshot('服务端已保存').content });

    expect(saveFlowDraftRequestMock).toHaveBeenCalledOnce();
    expect(autosave.savedSnapshot.value?.content).toEqual(textSnapshot('服务端已保存').content);
    expect(autosave.isDirty.value).toBe(false);
    expect(autosave.status.value).toBe('saved');
    expect(autosave.errorMessage.value).toMatch(/本地缓存/);
    storageSpy.mockRestore();
  });

  it('does not advance the baseline when an authenticated save fails', async () => {
    saveFlowDraftRequestMock.mockRejectedValue(new Error('offline'));
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('失败内容'));

    await expect(autosave.saveDraft()).rejects.toThrow('offline');

    expect(autosave.isDirty.value).toBe(true);
    expect(autosave.status.value).toBe('error');
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
  });

  it('keeps a conflict dirty and blocks repeated saves', async () => {
    saveFlowDraftRequestMock.mockRejectedValue({ response: { status: 409, data: { msg: '草稿版本冲突' } } });
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    autosave.recordSnapshot(textSnapshot('冲突内容'));

    await expect(autosave.saveDraft()).rejects.toBeDefined();

    expect(autosave.status.value).toBe('conflict');
    expect(autosave.errorMessage.value).toBe('草稿版本冲突');
    expect(autosave.isDirty.value).toBe(true);
    expect(autosave.canSave.value).toBe(false);
  });

  it('restores a newer authenticated local fallback as an unsaved change over the remote baseline', async () => {
    const local: FlowDraftLocalFallback = {
      schemaVersion: 2,
      actorKey: 'user:7',
      ...textSnapshot('较新的本地内容'),
      images: [],
      draftId: 18,
      version: 3,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:05:00.000Z',
    };
    window.localStorage.setItem(getFlowDraftLocalStorageKey(7), JSON.stringify(local));
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ version: 4 }) });
    const autosave = mountAutosave({ userId: 7, canSync: true });

    const restored = await autosave.initialize();

    expect(restored?.content).toEqual(local.content);
    expect(autosave.savedSnapshot.value?.content).toEqual(textSnapshot('服务端').content);
    expect(autosave.version.value).toBe(4);
    expect(autosave.isDirty.value).toBe(true);
    expect(autosave.canSave.value).toBe(true);
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
  });

  it('marks remote recovery as unsafe even when a complete local fallback is available', async () => {
    const local: FlowDraftLocalFallback = {
      schemaVersion: 2,
      actorKey: 'user:7',
      ...textSnapshot('仅本地可恢复'),
      images: [],
      draftId: 18,
      version: 3,
      serverUpdatedAt: '2026-08-11T02:00:00.000Z',
      localUpdatedAt: '2026-08-11T02:05:00.000Z',
    };
    window.localStorage.setItem(getFlowDraftLocalStorageKey(7), JSON.stringify(local));
    getFlowDraftRequestMock.mockRejectedValue(new Error('remote unavailable'));
    const autosave = mountAutosave({ userId: 7, canSync: true });

    const restored = await autosave.initialize();

    expect(restored?.content).toEqual(local.content);
    expect(autosave.isRecoveryBlocked.value).toBe(true);
    expect(autosave.status.value).toBe('error');
  });

  it('finishes safely when local fallback read and cleanup both throw', async () => {
    getFlowDraftRequestMock.mockRejectedValue(new Error('remote unavailable'));
    const getCacheSpy = vi.spyOn(LocalCache, 'getCache').mockImplementation(() => {
      throw new Error('storage read failed');
    });
    const removeCacheSpy = vi.spyOn(LocalCache, 'removeCache').mockImplementation(() => {
      throw new Error('storage cleanup failed');
    });
    const autosave = mountAutosave({ userId: 7, canSync: true });

    await expect(autosave.initialize()).resolves.toBeNull();

    expect(getFlowDraftRequestMock).toHaveBeenCalledOnce();
    expect(autosave.isHydrating.value).toBe(false);
    expect(autosave.isRecoveryBlocked.value).toBe(true);
    expect(autosave.status.value).toBe('error');
    getCacheSpy.mockRestore();
    removeCacheSpy.mockRestore();
  });

  it('restores a remote draft as an unchanged saved baseline', async () => {
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    const autosave = mountAutosave({ userId: 7, canSync: true });

    const restored = await autosave.initialize();

    expect(restored?.content).toEqual(textSnapshot('服务端').content);
    expect(autosave.savedMediaIds.value).toEqual([]);
    expect(autosave.hasContent.value).toBe(true);
    expect(autosave.isDirty.value).toBe(false);
    expect(autosave.canSave.value).toBe(false);
    expect(autosave.status.value).toBe('saved');
  });

  it('restores the last saved baseline without persistence side effects', async () => {
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    saveFlowDraftRequestMock.mockClear();
    autosave.recordSnapshot(textSnapshot('临时修改'));

    const baseline = autosave.restoreSavedBaseline();

    expect(baseline?.content).toEqual(textSnapshot('服务端').content);
    expect(autosave.isDirty.value).toBe(false);
    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
  });

  it('rejects explicit saves when referenced image descriptors are incomplete', async () => {
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    autosave.recordSnapshot({ ...textSnapshot('缺图'), meta: { imageIds: [42, 41], videoIds: [] } }, [imageAsset(41)]);

    await expect(autosave.saveDraft()).rejects.toThrow(/图片/);

    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(autosave.status.value).toBe('error');
  });

  it('sends image ids but not local descriptors in the explicit server payload', async () => {
    saveFlowDraftRequestMock.mockResolvedValue({
      data: remoteDraft({ meta: { imageIds: [42], videoIds: [] }, images: [imageAsset(42)], version: 1 }),
    });
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();
    autosave.recordSnapshot({ ...textSnapshot('带图'), meta: { imageIds: [42], videoIds: [] } }, [imageAsset(42)]);

    await autosave.saveDraft();

    expect(saveFlowDraftRequestMock).toHaveBeenCalledWith({
      content: textSnapshot('带图').content,
      meta: { imageIds: [42], videoIds: [] },
      version: 0,
    });
    expect(autosave.savedMediaIds.value).toEqual([42]);
  });

  it('rejects snapshots while clear is in progress', async () => {
    let resolveDelete!: (value: { data: { id: number } }) => void;
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    deleteFlowDraftRequestMock.mockImplementation(
      () =>
        new Promise<{ data: { id: number } }>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();

    const clearPromise = autosave.clearDraft();
    await flushPromises();

    expect(autosave.recordSnapshot(textSnapshot('清空期间输入'))).toBe(false);
    resolveDelete({ data: { id: 18 } });
    await clearPromise;
    expect(autosave.status.value).toBe('idle');
  });

  it('preserves the saved local fallback when remote clear fails', async () => {
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft() });
    deleteFlowDraftRequestMock.mockRejectedValue(new Error('delete unavailable'));
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();

    await expect(autosave.clearDraft()).rejects.toThrow('delete unavailable');

    expect(autosave.status.value).toBe('error');
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).not.toBeNull();
  });

  it('resets local state after publication and treats remote cleanup as best effort', async () => {
    getFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ id: 33 }) });
    deleteFlowDraftRequestMock.mockRejectedValue(new Error('remote cleanup unavailable'));
    const autosave = mountAutosave({ userId: 7, canSync: true });
    await autosave.initialize();

    await expect(autosave.resetAfterPublication()).resolves.toEqual({ remoteCleared: false });

    expect(deleteFlowDraftRequestMock).toHaveBeenCalledWith(33);
    expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
    expect(autosave.hasDraft.value).toBe(false);
    expect(autosave.status.value).toBe('idle');
  });
});
