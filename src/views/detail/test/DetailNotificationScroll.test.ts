import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { nextTick, reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const route = reactive({
  params: {
    articleId: '31',
  },
  query: {
    commentId: '41',
  } as Record<string, string>,
});

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => route,
  };
});

vi.mock('@/composables/useArticleDetail', () => ({
  useArticleDetail: () => ({
    article: ref({
      id: 31,
      title: '评论通知文章',
      author: {
        id: 10,
      },
    }),
    status: ref('success'),
    isDetailReady: ref(true),
  }),
}));

vi.mock('@/service/article/article.content', () => ({
  resolveArticleDetailHtml: () => '',
}));

vi.mock('@/components/navbar/NavBar.vue', () => ({
  default: {
    name: 'NavBar',
    template: '<nav><slot name="center" /></nav>',
  },
}));

vi.mock('../cpns/detail/DetailTools.vue', () => ({
  default: {
    name: 'DetailTools',
    template: '<div />',
  },
}));

vi.mock('../cpns/detail/DetailContent.vue', () => ({
  default: {
    name: 'DetailContent',
    template: '<article />',
  },
}));

vi.mock('../cpns/detail/DetailPanel.vue', () => ({
  default: {
    name: 'DetailPanel',
    template: '<aside />',
  },
}));

vi.mock('../cpns/detail/DetailToc.vue', () => ({
  default: {
    name: 'DetailToc',
    template: '<aside />',
  },
}));

vi.mock('../cpns/comment/Comment.vue', () => ({
  default: {
    name: 'Comment',
    template: '<section class="comment-stub">comments</section>',
  },
}));

vi.mock('@/components/ai/AiAssistant.vue', () => ({
  default: {
    name: 'AiAssistant',
    template: '<aside />',
  },
}));

import Detail from '../Detail.vue';

describe('Detail notification comment entry', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    route.query = { commentId: '41' };
    scrollIntoView.mockReset();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  it('scrolls to the comment section when opened from an article-comment notification', async () => {
    mount(Detail, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: {
                userInfo: { id: 20 },
              },
            },
          }),
        ],
      },
    });

    await nextTick();
    await nextTick();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });
});
