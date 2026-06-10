import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const articleMocks = vi.hoisted(() => ({
  useArticleList: vi.fn(),
  useUserLikedArticles: vi.fn(),
  useLikeArticle: vi.fn(),
}));

const scrollMocks = vi.hoisted(() => ({
  useInfiniteScroll: vi.fn(),
}));

vi.mock('@/composables/useArticleList', () => articleMocks);
vi.mock('@/composables/useInfiniteScroll', () => scrollMocks);

import UserArticle from '../UserArticle.vue';

function setArticleQuery(overrides: Record<string, unknown> = {}) {
  const query = {
    items: ref([]),
    isPending: ref(false),
    isError: ref(false),
    error: ref<Error | null>(null),
    hasNextPage: ref(false),
    isFetchingNextPage: ref(false),
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
  articleMocks.useArticleList.mockReturnValue(query);
  return query;
}

function mountUserArticle() {
  return mount(UserArticle, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            user: {
              profile: {
                id: 7,
                sex: '男',
                articleCount: 1,
              },
            },
          },
        }),
      ],
      stubs: {
        ListItem: {
          props: ['item'],
          template: '<div class="article-item">{{ item.title }}<slot name="action" /></div>',
        },
        ArticleAction: true,
        ElSkeleton: { template: '<div class="skeleton" />' },
        ElButton: true,
      },
    },
  });
}

describe('UserArticle', () => {
  beforeEach(() => {
    articleMocks.useUserLikedArticles.mockReturnValue({ isLiked: vi.fn(() => false) });
    articleMocks.useLikeArticle.mockReturnValue({ mutate: vi.fn() });
    scrollMocks.useInfiniteScroll.mockReturnValue({ infiniteSentinel: ref(null) });
  });

  it('renders initial loading and error retry states', async () => {
    const query = setArticleQuery({ isPending: ref(true) });
    const wrapper = mountUserArticle();
    expect(wrapper.find('.skeleton').exists()).toBe(true);

    query.isPending.value = false;
    query.isError.value = true;
    query.error.value = new Error('network');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('network');
    await wrapper.find('.retry-button').trigger('click');
    expect(query.refetch).toHaveBeenCalledOnce();
  });

  it('renders an empty state without the legacy page component', () => {
    setArticleQuery();
    const wrapper = mountUserArticle();

    expect(wrapper.text()).toContain('这个人未发表过文章');
    expect(wrapper.findComponent({ name: 'Page' }).exists()).toBe(false);
  });

  it('renders query items and connects the shared infinite-scroll loader', () => {
    const query = setArticleQuery({
      items: ref([{ id: 1, title: 'Query article' }]),
      hasNextPage: ref(true),
    });
    const wrapper = mountUserArticle();

    expect(wrapper.text()).toContain('Query article');
    const scrollOptions = scrollMocks.useInfiniteScroll.mock.calls.at(-1)?.[0];
    scrollOptions.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledOnce();
  });
});
