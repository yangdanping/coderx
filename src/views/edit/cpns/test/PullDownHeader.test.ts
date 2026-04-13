import { flushPromises, shallowMount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  confirmMock,
  deleteDraftRequestMock,
  routerPushMock,
  articleTagsRef,
  localCacheSetMock,
  localCacheRemoveMock,
  getTagsActionMock,
  deletePendingImagesActionMock,
  deletePendingVideosActionMock,
  uploadCoverActionMock,
  extractImagesFromHtmlMock,
  showInfoMock,
} = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  deleteDraftRequestMock: vi.fn(),
  routerPushMock: vi.fn(),
  articleTagsRef: [],
  localCacheSetMock: vi.fn(),
  localCacheRemoveMock: vi.fn(),
  getTagsActionMock: vi.fn(),
  deletePendingImagesActionMock: vi.fn(),
  deletePendingVideosActionMock: vi.fn(),
  uploadCoverActionMock: vi.fn(),
  extractImagesFromHtmlMock: vi.fn(),
  showInfoMock: vi.fn(),
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
    query: {},
  }),
  useRouter: () => ({
    push: routerPushMock,
    back: vi.fn(),
  }),
}));

vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: confirmMock,
  },
}));

vi.mock('@/stores/article.store', () => ({
  default: () => ({
    tags: articleTagsRef,
    getTagsAction: getTagsActionMock,
  }),
}));

vi.mock('@/stores/editor.store', () => ({
  default: () => ({
    pendingImageIds: [],
    pendingVideoIds: [],
    deletePendingImagesAction: deletePendingImagesActionMock,
    deletePendingVideosAction: deletePendingVideosActionMock,
    uploadCoverAction: uploadCoverActionMock,
  }),
}));

vi.mock('@/service/draft/draft.request', () => ({
  deleteDraftRequest: deleteDraftRequestMock,
}));

vi.mock('@/utils', () => ({
  LocalCache: {
    setCache: localCacheSetMock,
    removeCache: localCacheRemoveMock,
  },
  Msg: {
    showInfo: showInfoMock,
    showSuccess: vi.fn(),
  },
  extractImagesFromHtml: extractImagesFromHtmlMock,
}));

import PullDownHeader from '../PullDownHeader.vue';

const passthroughStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

describe('PullDownHeader', () => {
  beforeEach(() => {
    confirmMock.mockReset();
    deleteDraftRequestMock.mockReset();
    routerPushMock.mockReset();
    localCacheSetMock.mockReset();
    localCacheRemoveMock.mockReset();
    getTagsActionMock.mockReset();
    deletePendingImagesActionMock.mockReset();
    deletePendingVideosActionMock.mockReset();
    uploadCoverActionMock.mockReset();
    extractImagesFromHtmlMock.mockReset();
    showInfoMock.mockReset();

    routerPushMock.mockResolvedValue(undefined);
    getTagsActionMock.mockResolvedValue(undefined);
    uploadCoverActionMock.mockResolvedValue(undefined);
    extractImagesFromHtmlMock.mockReturnValue([]);
  });

  it('deletes the remote draft when user chooses not save exit in create mode', async () => {
    confirmMock.mockRejectedValue('cancel');
    deleteDraftRequestMock.mockResolvedValue({ code: 0 });

    const wrapper = shallowMount(PullDownHeader, {
      props: {
        modelValue: '',
        isPulled: true,
        draft: '<p>draft</p>',
        draftId: 6,
      },
      global: {
        stubs: {
          ElSelect: passthroughStub,
          ElOption: true,
          ElTooltip: passthroughStub,
          Check: true,
          LogOut: true,
          ImagePlus: true,
          X: true,
        },
      },
    });

    await wrapper.get('.exit-action-btn').trigger('click');
    await flushPromises();

    expect(deleteDraftRequestMock).toHaveBeenCalledWith(6);
    expect(localCacheRemoveMock).toHaveBeenCalledWith('draft');
    expect(routerPushMock).toHaveBeenCalledWith('/article');
  });

  it('does not backfill draft cover fileList from the first body image when saving exit in create mode', async () => {
    confirmMock.mockResolvedValue(undefined);
    extractImagesFromHtmlMock.mockReturnValue(['https://api.example/article/images/body-1.jpg']);

    const wrapper = shallowMount(PullDownHeader, {
      props: {
        modelValue: '草稿标题',
        isPulled: true,
        draft: '<p>draft</p>',
      },
      global: {
        stubs: {
          ElSelect: passthroughStub,
          ElOption: true,
          ElTooltip: passthroughStub,
          Check: true,
          LogOut: true,
          ImagePlus: true,
          X: true,
        },
      },
    });

    await wrapper.get('.exit-action-btn').trigger('click');
    await flushPromises();

    expect(localCacheSetMock).toHaveBeenCalledWith(
      'draft',
      expect.objectContaining({
        fileList: [],
      }),
    );
  });

  it('rejects cover files larger than 2MB before calling uploadCoverAction', async () => {
    const wrapper = shallowMount(PullDownHeader, {
      props: {
        modelValue: '',
        isPulled: true,
      },
      global: {
        stubs: {
          ElSelect: passthroughStub,
          ElOption: true,
          ElTooltip: passthroughStub,
          Check: true,
          LogOut: true,
          ImagePlus: true,
          X: true,
        },
      },
    });

    const file = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: 2 * 1024 * 1024 + 1,
    });

    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    });

    await input.trigger('change');

    expect(showInfoMock).toHaveBeenCalledWith('封面图片大小不能超过 2MB');
    expect(uploadCoverActionMock).not.toHaveBeenCalled();
  });
});
