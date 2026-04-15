import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  editorHarness,
  pullDownHeaderState,
  routeQuery,
  articleStoreState,
  editorStoreState,
  loadDraftMock,
  flushPendingSaveMock,
  localCacheGetMock,
  localCacheSetMock,
  localCacheRemoveMock,
  getTagsActionMock,
  getDetailActionMock,
  createActionMock,
  updateActionMock,
  clearPendingFilesMock,
  addPendingImageIdMock,
  addPendingVideoIdMock,
  setManualCoverImgIdMock,
  scheduleSaveMock,
} = vi.hoisted(() => ({
  editorHarness: {
    instances: [] as Array<{
      makeReady: () => Promise<void>;
      getContent: () => string;
      getSelectionToEndCallCount: () => number;
    }>,
  },
  pullDownHeaderState: {
    latestCoverPreviewUrl: undefined as string | null | undefined,
  },
  routeQuery: {} as Record<string, unknown>,
  articleStoreState: {
    articleValue: {
      images: [],
      videos: [],
      tags: [],
    } as Record<string, unknown>,
    tagsValue: [] as unknown[],
  },
  editorStoreState: {
    manualCoverImgId: null as any,
    pendingImageIds: null as any,
    pendingVideoIds: null as any,
  },
  loadDraftMock: vi.fn(),
  flushPendingSaveMock: vi.fn(),
  localCacheGetMock: vi.fn(),
  localCacheSetMock: vi.fn(),
  localCacheRemoveMock: vi.fn(),
  getTagsActionMock: vi.fn(),
  getDetailActionMock: vi.fn(),
  createActionMock: vi.fn(),
  updateActionMock: vi.fn(),
  clearPendingFilesMock: vi.fn(),
  addPendingImageIdMock: vi.fn(),
  addPendingVideoIdMock: vi.fn(),
  setManualCoverImgIdMock: vi.fn(),
  scheduleSaveMock: vi.fn(),
}));

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia');
  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => store,
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQuery,
  }),
}));

vi.mock('@/components/tiptap-editor/TiptapEditor.vue', async () => {
  const { defineComponent, h, nextTick, onMounted, ref } = await import('vue');

  return {
    default: defineComponent({
      emits: ['update:content', 'update:json-content', 'ready'],
      setup(_, { emit, expose }) {
        const ready = ref(false);
        const content = ref('');
        let selectionToEndCallCount = 0;

        const setContent = (incoming: string | Record<string, unknown>, emitUpdate = true) => {
          if (!ready.value) return;

          content.value = typeof incoming === 'string' ? incoming : JSON.stringify(incoming);

          if (emitUpdate) {
            emit('update:content', content.value);
            emit('update:json-content', typeof incoming === 'string' ? { type: 'doc', content: [] } : incoming);
          }
        };

        onMounted(() => {
          editorHarness.instances.push({
            makeReady: async () => {
              ready.value = true;
              emit('ready');
              await nextTick();
            },
            getContent: () => content.value,
            getSelectionToEndCallCount: () => selectionToEndCallCount,
          });
        });

        expose({
          getHTML: () => content.value,
          getJSON: () => (content.value ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content.value }] }] } : undefined),
          setContent,
          getEditor: () => (ready.value ? {} : undefined),
          setSelectionToEnd: () => {
            selectionToEndCallCount += 1;
          },
        });

        return () =>
          h('div', { 'data-testid': 'editor-stub' }, [
            h('button', {
              'data-testid': 'simulate-editor-update',
              onClick: () => {
                content.value = '<h2>编辑后内容</h2>';
                emit('update:content', content.value);
                emit('update:json-content', {
                  type: 'doc',
                  content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '编辑后内容' }] }],
                });
              },
            }),
            content.value,
          ]);
      },
    }),
  };
});

vi.mock('../cpns/PullDownHeader.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: {
        coverPreviewUrl: {
          type: String,
          default: null,
        },
        modelValue: {
          type: String,
          default: '',
        },
        tags: {
          type: Array,
          default: () => [],
        },
      },
      emits: ['discard-draft', 'formSubmit'],
      setup(props, { emit }) {
        return () =>
          {
            pullDownHeaderState.latestCoverPreviewUrl = props.coverPreviewUrl ?? null;
            return h('div', { 'data-testid': 'pull-down-header-stub' }, [
              h('button', {
                'data-testid': 'discard-draft',
                onClick: () => emit('discard-draft'),
              }),
              h('button', {
                'data-testid': 'submit-draft',
                onClick: () =>
                  emit('formSubmit', {
                    title: props.modelValue || '测试标题',
                    tags: [...(props.tags ?? [])],
                  }),
              }),
            ]);
          };
      },
    }),
  };
});

vi.mock('@/components/AiAssistant.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      setup() {
        return () => h('div', { 'data-testid': 'ai-assistant-stub' });
      },
    }),
  };
});

vi.mock('@/composables/useDraftAutosave', async () => {
  const { ref } = await import('vue');
  return {
    useDraftAutosave: () => {
      const isHydrating = ref(false);

      return {
        status: ref('idle'),
        errorMessage: ref(''),
        draftId: ref(101),
        version: ref(3),
        lastSavedAt: ref('2026-04-10T16:06:36.000Z'),
        isHydrating,
        isSaving: ref(false),
        hasUnsavedChanges: ref(false),
        scheduleSave: scheduleSaveMock,
        flushPendingSave: flushPendingSaveMock,
        loadDraft: loadDraftMock,
        clearDraft: vi.fn(),
        hydrateFromDraft: vi.fn(),
        markConflict: vi.fn(),
        setHydrating: (value: boolean) => {
          isHydrating.value = value;
        },
        cancelPendingSave: vi.fn(),
        resetState: vi.fn(),
      };
    },
  };
});

vi.mock('@/stores/article.store', async () => {
  const { ref } = await import('vue');
  return {
    default: () => ({
      article: ref(articleStoreState.articleValue),
      tags: ref(articleStoreState.tagsValue),
      getTagsAction: getTagsActionMock,
      getDetailAction: getDetailActionMock,
      createAction: createActionMock,
      updateAction: updateActionMock,
    }),
  };
});

vi.mock('@/stores/editor.store', async () => {
  const { ref } = await import('vue');
  if (!editorStoreState.manualCoverImgId) {
    editorStoreState.manualCoverImgId = ref<number | null>(null);
    editorStoreState.pendingImageIds = ref<number[]>([]);
    editorStoreState.pendingVideoIds = ref<number[]>([]);
  }

  return {
    default: () => ({
      manualCoverImgId: editorStoreState.manualCoverImgId,
      pendingImageIds: editorStoreState.pendingImageIds,
      pendingVideoIds: editorStoreState.pendingVideoIds,
      clearPendingFiles: () => {
        editorStoreState.manualCoverImgId.value = null;
        editorStoreState.pendingImageIds.value = [];
        editorStoreState.pendingVideoIds.value = [];
        clearPendingFilesMock();
      },
      addPendingImageId: (id: number) => {
        editorStoreState.pendingImageIds.value = [...editorStoreState.pendingImageIds.value, id];
        addPendingImageIdMock(id);
      },
      addPendingVideoId: (id: number) => {
        editorStoreState.pendingVideoIds.value = [...editorStoreState.pendingVideoIds.value, id];
        addPendingVideoIdMock(id);
      },
      setManualCoverImgId: (id: number | null) => {
        editorStoreState.manualCoverImgId.value = id;
        setManualCoverImgIdMock(id);
      },
    }),
  };
});

vi.mock('@/utils', () => ({
  Msg: {
    showFail: vi.fn(),
  },
  isEmptyObj: vi.fn((value: Record<string, unknown>) => Object.keys(value ?? {}).length > 0),
  LocalCache: {
    getCache: localCacheGetMock,
    setCache: localCacheSetMock,
    removeCache: localCacheRemoveMock,
  },
  extractImagesFromHtml: vi.fn(() => []),
  extractVideoIdsFromHtml: vi.fn(() => []),
  extractVideoReferencesFromHtml: vi.fn(() => []),
  extractVideosFromHtml: vi.fn(() => []),
}));

import Edit from '../Edit.vue';

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('Edit', () => {
  const mountedWrappers: VueWrapper[] = [];

  afterEach(() => {
    while (mountedWrappers.length) {
      mountedWrappers.pop()?.unmount();
    }
  });

  beforeEach(() => {
    editorHarness.instances.length = 0;
    pullDownHeaderState.latestCoverPreviewUrl = undefined;
    Object.keys(routeQuery).forEach((key) => delete routeQuery[key]);
    articleStoreState.articleValue = {
      images: [],
      videos: [],
      tags: [],
    };
    articleStoreState.tagsValue = [];
    if (editorStoreState.manualCoverImgId) {
      editorStoreState.manualCoverImgId.value = null;
      editorStoreState.pendingImageIds.value = [];
      editorStoreState.pendingVideoIds.value = [];
    }
    loadDraftMock.mockReset();
    flushPendingSaveMock.mockReset();
    localCacheGetMock.mockReset();
    localCacheSetMock.mockReset();
    localCacheRemoveMock.mockReset();
    getTagsActionMock.mockReset();
    getDetailActionMock.mockReset();
    createActionMock.mockReset();
    updateActionMock.mockReset();
    clearPendingFilesMock.mockReset();
    addPendingImageIdMock.mockReset();
    addPendingVideoIdMock.mockReset();
    setManualCoverImgIdMock.mockReset();
    scheduleSaveMock.mockReset();

    localCacheGetMock.mockReturnValue(null);
    flushPendingSaveMock.mockResolvedValue(undefined);
    getTagsActionMock.mockResolvedValue(undefined);
    getDetailActionMock.mockResolvedValue(undefined);
    createActionMock.mockResolvedValue(true);
    updateActionMock.mockResolvedValue(true);
  });

  it('restores remote draft content after the editor reports ready', async () => {
    loadDraftMock.mockResolvedValue({
      id: 101,
      articleId: null,
      title: null,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '你好,最近怎么样' }],
          },
        ],
      },
      meta: {
        imageIds: [],
        videoIds: [],
        coverImageId: null,
        selectedTagIds: [],
      },
      version: 3,
      updateAt: '2026-04-10T16:06:36.000Z',
    });

    mountedWrappers.push(
      mount(Edit, {
        global: {
          stubs: {
            'i-loading': true,
          },
        },
      }),
    );

    await flushPromises();

    expect(editorHarness.instances).toHaveLength(1);
    expect(editorHarness.instances[0].getContent()).toBe('');

    await editorHarness.instances[0].makeReady();
    await flushPromises();

    expect(editorHarness.instances[0].getContent()).toContain('你好,最近怎么样');
    expect(editorHarness.instances[0].getSelectionToEndCallCount()).toBe(1);
  });

  it('stops rewriting local fallback after the user discards the draft', async () => {
    loadDraftMock.mockResolvedValue({
      id: 101,
      articleId: null,
      title: null,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '你好,最近怎么样' }],
          },
        ],
      },
      meta: {
        imageIds: [],
        videoIds: [],
        coverImageId: null,
        selectedTagIds: [],
      },
      version: 3,
      updateAt: '2026-04-10T16:06:36.000Z',
    });

    const wrapper = mount(Edit, {
      global: {
        stubs: {
          'i-loading': true,
        },
      },
    });
    mountedWrappers.push(wrapper);

    await flushPromises();
    await editorHarness.instances[0].makeReady();
    await flushPromises();

    localCacheSetMock.mockClear();
    localCacheRemoveMock.mockClear();

    await wrapper.get('[data-testid="discard-draft"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="simulate-editor-update"]').trigger('click');
    await flushPromises();

    expect(localCacheRemoveMock).toHaveBeenCalledWith('draft');
    expect(localCacheSetMock).not.toHaveBeenCalled();
  });

  it('does not derive cover preview from the first body image when an existing article has no explicit cover', async () => {
    routeQuery.editArticleId = '42';
    articleStoreState.articleValue = {
      id: 42,
      title: '已有文章',
      content: '<p>已有正文</p>',
      cover: null,
      images: [{ id: 11, url: 'https://api.example/article/images/body-1.jpg' }],
      videos: [],
      tags: [],
    };
    loadDraftMock.mockResolvedValue(null);

    mountedWrappers.push(
      mount(Edit, {
        global: {
          stubs: {
            'i-loading': true,
          },
        },
      }),
    );

    await flushPromises();
    expect(editorHarness.instances).toHaveLength(1);

    await editorHarness.instances[0].makeReady();
    await flushPromises();

    expect(pullDownHeaderState.latestCoverPreviewUrl).toBeNull();
  });

  it('prefers contentJson over legacy content when editing an existing article', async () => {
    routeQuery.editArticleId = '42';
    articleStoreState.articleValue = {
      id: 42,
      title: '已有文章',
      content: '<p>旧 HTML 正文</p>',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '来自结构化正文' }],
          },
        ],
      },
      cover: null,
      images: [],
      videos: [],
      tags: [],
    };
    loadDraftMock.mockResolvedValue(null);

    mountedWrappers.push(
      mount(Edit, {
        global: {
          stubs: {
            'i-loading': true,
          },
        },
      }),
    );

    await flushPromises();
    await editorHarness.instances[0].makeReady();
    await flushPromises();

    expect(editorHarness.instances[0].getContent()).toContain('来自结构化正文');
  });

  it('flushes pending autosave before create submit and forwards the current draftId', async () => {
    loadDraftMock.mockResolvedValue(null);
    const deferred = createDeferred<void>();
    flushPendingSaveMock.mockImplementation(() => deferred.promise);

    const wrapper = mount(Edit, {
      global: {
        stubs: {
          'i-loading': true,
        },
      },
    });
    mountedWrappers.push(wrapper);

    await flushPromises();
    await editorHarness.instances[0].makeReady();
    await flushPromises();

    await wrapper.get('[data-testid="simulate-editor-update"]').trigger('click');
    await flushPromises();

    const submitPromise = wrapper.get('[data-testid="submit-draft"]').trigger('click');
    await Promise.resolve();

    expect(flushPendingSaveMock).toHaveBeenCalledTimes(1);
    expect(createActionMock).not.toHaveBeenCalled();

    deferred.resolve();
    await submitPromise;
    await flushPromises();

    expect(flushPendingSaveMock).toHaveBeenCalledTimes(1);
    expect(createActionMock).toHaveBeenCalledWith({
      title: '测试标题',
      contentJson: {
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '编辑后内容' }] }],
      },
      tags: [],
      draftId: 101,
    });
  });

  it('flushes pending autosave before update submit and forwards the current draftId', async () => {
    routeQuery.editArticleId = '42';
    articleStoreState.articleValue = {
      id: 42,
      title: '已有文章',
      content: '<p>已有正文</p>',
      cover: null,
      images: [],
      videos: [],
      tags: [],
    };
    loadDraftMock.mockResolvedValue(null);
    const deferred = createDeferred<void>();
    flushPendingSaveMock.mockImplementation(() => deferred.promise);

    const wrapper = mount(Edit, {
      global: {
        stubs: {
          'i-loading': true,
        },
      },
    });
    mountedWrappers.push(wrapper);

    await flushPromises();
    await editorHarness.instances[0].makeReady();
    await flushPromises();

    await wrapper.get('[data-testid="simulate-editor-update"]').trigger('click');
    await flushPromises();

    const submitPromise = wrapper.get('[data-testid="submit-draft"]').trigger('click');
    await Promise.resolve();

    expect(flushPendingSaveMock).toHaveBeenCalledTimes(1);
    expect(updateActionMock).not.toHaveBeenCalled();

    deferred.resolve();
    await submitPromise;
    await flushPromises();

    expect(flushPendingSaveMock).toHaveBeenCalledTimes(1);
    expect(updateActionMock).toHaveBeenCalledWith({
      articleId: 42,
      title: '已有文章',
      contentJson: {
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '编辑后内容' }] }],
      },
      tags: [],
      draftId: 101,
    });
  });

  it('does not rewrite local fallback after a successful submit clears the draft cache', async () => {
    routeQuery.editArticleId = '42';
    articleStoreState.articleValue = {
      id: 42,
      title: '已有文章',
      content: '<p>已有正文</p>',
      cover: null,
      images: [{ id: 11, url: 'https://api.example/article/images/body-1.jpg' }],
      videos: [],
      tags: [],
    };
    loadDraftMock.mockResolvedValue({
      id: 101,
      articleId: 42,
      title: '已有文章',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '发布后不应残留本地草稿' }],
          },
        ],
      },
      meta: {
        imageIds: [440],
        videoIds: [435],
        coverImageId: null,
        selectedTagIds: [],
      },
      version: 3,
      updateAt: '2026-04-12T13:35:20.353Z',
    });
    updateActionMock.mockImplementation(async () => {
      localCacheRemoveMock('draft');
      editorStoreState.manualCoverImgId.value = null;
      editorStoreState.pendingImageIds.value = [];
      editorStoreState.pendingVideoIds.value = [];
      return true;
    });

    const wrapper = mount(Edit, {
      global: {
        stubs: {
          'i-loading': true,
        },
      },
    });
    mountedWrappers.push(wrapper);

    await flushPromises();
    await editorHarness.instances[0].makeReady();
    await flushPromises();
    await flushPromises();
    const setCallCountBeforeSubmit = localCacheSetMock.mock.calls.length;
    const removeCallCountBeforeSubmit = localCacheRemoveMock.mock.calls.length;

    await wrapper.get('[data-testid="submit-draft"]').trigger('click');
    await flushPromises();

    expect(localCacheRemoveMock.mock.calls.slice(removeCallCountBeforeSubmit)).toContainEqual(['draft']);
    expect(localCacheSetMock).toHaveBeenCalledTimes(setCallCountBeforeSubmit);
  });
});
