import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const articleLikeMocks = vi.hoisted(() => ({
  isLiked: vi.fn<(articleId: number | string) => boolean>(),
  mutate: vi.fn(),
  useUserLikedArticles: vi.fn(),
  useLikeArticle: vi.fn(),
}));

const utilityMocks = vi.hoisted(() => ({
  showFail: vi.fn(),
  showInfo: vi.fn(),
  emit: vi.fn(),
}));

vi.mock('@/composables/useArticleList', () => ({
  useUserLikedArticles: articleLikeMocks.useUserLikedArticles,
  useLikeArticle: articleLikeMocks.useLikeArticle,
}));

vi.mock('@/utils/debounce', () => ({
  default: (callback: (...args: unknown[]) => unknown) => callback,
}));

vi.mock('@/utils', () => ({
  Msg: {
    showFail: utilityMocks.showFail,
    showInfo: utilityMocks.showInfo,
  },
  emitter: {
    emit: utilityMocks.emit,
  },
}));

import DetailPanel from '../DetailPanel.vue';

function mountDetailPanel() {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    initialState: {
      user: {
        token: 'token',
        userInfo: { id: 42 },
      },
    },
  });

  const wrapper = mount(DetailPanel, {
    props: {
      article: {
        id: 9,
        likes: 3,
        commentCount: 2,
        views: 10,
      },
    },
    global: {
      plugins: [pinia],
      stubs: {
        Icon: {
          props: ['type', 'isActive', 'label'],
          emits: ['click'],
          template:
            '<button class="icon-stub" :data-type="type" :data-active="String(Boolean(isActive))" :data-label="String(label)" @click="$emit(\'click\')" />',
        },
        DetailCollect: true,
        ElPopover: {
          inheritAttrs: false,
          template: '<div class="popover-stub"><slot /></div>',
        },
      },
    },
  });

  return wrapper;
}

describe('DetailPanel article like', () => {
  beforeEach(() => {
    articleLikeMocks.isLiked.mockReset();
    articleLikeMocks.isLiked.mockReturnValue(true);
    articleLikeMocks.mutate.mockReset();
    articleLikeMocks.useUserLikedArticles.mockReset();
    articleLikeMocks.useUserLikedArticles.mockReturnValue({ isLiked: articleLikeMocks.isLiked });
    articleLikeMocks.useLikeArticle.mockReset();
    articleLikeMocks.useLikeArticle.mockReturnValue({ mutate: articleLikeMocks.mutate });
  });

  it('reads the shared liked state and submits through the shared mutation', async () => {
    const wrapper = mountDetailPanel();
    const likeIcon = wrapper.get('[data-type="like"]');

    expect(likeIcon.attributes('data-active')).toBe('true');
    expect(likeIcon.attributes('data-label')).toBe('3');

    await likeIcon.trigger('click');

    expect(articleLikeMocks.useUserLikedArticles).toHaveBeenCalledOnce();
    expect(articleLikeMocks.useLikeArticle).toHaveBeenCalledOnce();
    expect(articleLikeMocks.mutate).toHaveBeenCalledWith(9);
    await wrapper.setProps({ article: { id: 9, likes: 4, commentCount: 2, views: 10 } });
    expect(wrapper.get('[data-type="like"]').attributes('data-label')).toBe('4');
  });
});
