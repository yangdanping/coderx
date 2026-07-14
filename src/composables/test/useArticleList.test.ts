import { defineComponent, h } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { articleKeys, articleListInfiniteOptions, normalizeArticleListParams, useLikeArticle, useUserLikedArticles } from '@/composables/useArticleList';
import { getList, likeArticle } from '@/service/article/article.request';
import { getLiked } from '@/service/user/user.request';
import Icon from '@/components/icon/Icon.vue';
import { activeColor, defaultColor } from '@/global/constants/color';

import type { InfiniteData } from '@tanstack/vue-query';
import type { IArticle, IArticles } from '@/stores/types/article.result';

vi.mock('@/service/article/article.request', () => ({
  getList: vi.fn(),
  likeArticle: vi.fn(),
}));

vi.mock('@/service/user/user.request', () => ({
  getLiked: vi.fn(),
}));

vi.mock('@/utils', () => ({
  Msg: {
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showFail: vi.fn(),
  },
}));

interface IDeferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

interface IUserLikedArticlesData {
  articleLiked: Array<number | string>;
}

function createDeferred<T>(): IDeferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function mountLikeMutation(queryClient: QueryClient) {
  let mutation: ReturnType<typeof useLikeArticle> | undefined;
  const wrapper = mount(
    defineComponent({
      setup() {
        mutation = useLikeArticle();
        return () => h('div');
      },
    }),
    {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: {
                userInfo: { id: 42 },
              },
            },
          }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    },
  );

  return {
    get mutation() {
      if (!mutation) throw new Error('Expected like mutation to be initialized');
      return mutation;
    },
    wrapper,
  };
}

function mountReactiveLikeState(queryClient: QueryClient) {
  let mutation: ReturnType<typeof useLikeArticle> | undefined;
  const wrapper = mount(
    defineComponent({
      setup() {
        const { isLiked } = useUserLikedArticles();
        mutation = useLikeArticle();
        return () => h(Icon, { type: 'like', isActive: isLiked(9), label: 3, onClick: () => mutation?.mutate(9) });
      },
    }),
    {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: {
                userInfo: { id: 42 },
              },
            },
          }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    },
  );

  return {
    get mutation() {
      if (!mutation) throw new Error('Expected like mutation to be initialized');
      return mutation;
    },
    wrapper,
  };
}

function buildInfiniteArticles(article: IArticle): InfiniteData<IArticles> {
  return {
    pages: [{ result: [article], total: 1 }],
    pageParams: [1],
  };
}

function getArticleLikes(queryClient: QueryClient, queryKey: readonly unknown[], articleId: number) {
  const data = queryClient.getQueryData<InfiniteData<IArticles>>(queryKey);
  return data?.pages.flatMap((page) => page.result ?? []).find((article) => Number(article.id) === articleId)?.likes;
}

function normalizeCssColor(color: string) {
  const element = document.createElement('span');
  element.style.color = color;
  return element.style.color;
}

describe('article list query options', () => {
  beforeEach(() => {
    vi.mocked(getList).mockReset();
    vi.mocked(likeArticle).mockReset();
  });

  it('uses one normalized parameter object for its key and request', async () => {
    vi.mocked(getList).mockResolvedValue({
      code: 0,
      data: {
        result: [{ id: 21 }],
        total: 3,
      },
    } as never);

    const normalized = normalizeArticleListParams({
      userId: 7,
      pageOrder: 'date',
      keywords: '',
      pageSize: 2,
    });
    const options = articleListInfiniteOptions(normalized);
    const signal = new AbortController().signal;

    expect(options.queryKey).toEqual(articleKeys.list(normalized));

    if (typeof options.queryFn !== 'function') {
      throw new Error('Expected article queryFn to be callable');
    }
    const page = await options.queryFn({
      pageParam: 2,
      signal,
      queryKey: options.queryKey,
      direction: 'forward',
      meta: undefined,
      client: undefined,
    } as never);

    expect(getList).toHaveBeenCalledWith(
      {
        ...normalized,
        pageNum: 2,
      },
      undefined,
      signal,
    );
    expect(page.result).toEqual([{ id: 21 }]);
  });

  it('normalizes article search keywords case-insensitively', () => {
    expect(normalizeArticleListParams({ keywords: '  Vue  ' }).keywords).toBe('vue');
  });

  it('returns the next page only while the loaded item count is below total', () => {
    const options = articleListInfiniteOptions(normalizeArticleListParams({ pageSize: 2 }));
    const firstPage = { result: [{ id: 1 }, { id: 2 }], total: 3 };
    const lastPage = { result: [{ id: 3 }], total: 3 };

    expect(options.getNextPageParam(firstPage, [firstPage], 1, [1])).toBe(2);
    expect(options.getNextPageParam(lastPage, [firstPage, lastPage], 2, [1, 2])).toBeUndefined();
    expect(articleKeys.lists()).toEqual(['articles', 'list']);
  });
});

describe('article like mutation', () => {
  beforeEach(() => {
    vi.mocked(likeArticle).mockReset();
    vi.mocked(getLiked).mockReset();
  });

  it('keeps the icon active after the server liked state is revalidated', async () => {
    vi.mocked(getLiked)
      .mockResolvedValueOnce({ code: 0, data: { articleLiked: [] } } as never)
      .mockResolvedValueOnce({ code: 0, data: { articleLiked: [9] } } as never);
    vi.mocked(likeArticle).mockResolvedValue({ code: 0, data: { liked: true, likes: 4 } } as never);
    const queryClient = createQueryClient();
    const harness = mountReactiveLikeState(queryClient);

    await vi.waitFor(() => expect(getLiked).toHaveBeenCalledTimes(1));
    expect((harness.wrapper.get('.icon span').element as HTMLElement).style.color).toBe(normalizeCssColor(defaultColor));

    await harness.wrapper.get('.icon').trigger('click');
    await vi.waitFor(() => expect(harness.mutation.isSuccess.value).toBe(true));
    await vi.waitFor(() => expect(getLiked).toHaveBeenCalledTimes(2));

    expect((harness.wrapper.get('.icon span').element as HTMLElement).style.color).toBe(normalizeCssColor(activeColor));
    harness.wrapper.unmount();
  });

  it('optimistically updates every list, the detail, and the liked state before the request resolves', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof likeArticle>>>();
    vi.mocked(likeArticle).mockReturnValue(deferred.promise);
    const queryClient = createQueryClient();
    const firstListKey = articleKeys.list(normalizeArticleListParams({ pageOrder: 'date' }));
    const secondListKey = articleKeys.list(normalizeArticleListParams({ pageOrder: 'hot' }));
    const detailKey = ['articles', 'detail', 9] as const;
    const likedKey = articleKeys.userLiked(42);
    queryClient.setQueryData(firstListKey, buildInfiniteArticles({ id: 9, likes: 3 }));
    queryClient.setQueryData(secondListKey, buildInfiniteArticles({ id: 9, likes: 3 }));
    queryClient.setQueryData<IArticle>(detailKey, { id: 9, likes: 3 });
    queryClient.setQueryData<IUserLikedArticlesData>(likedKey, { articleLiked: [] });
    const harness = mountLikeMutation(queryClient);

    harness.mutation.mutate(9);

    await vi.waitFor(() => {
      expect(getArticleLikes(queryClient, firstListKey, 9)).toBe(4);
      expect(getArticleLikes(queryClient, secondListKey, 9)).toBe(4);
      expect(queryClient.getQueryData<IArticle>(detailKey)?.likes).toBe(4);
      expect(queryClient.getQueryData<IUserLikedArticlesData>(likedKey)?.articleLiked).toEqual([9]);
    });

    deferred.resolve({ code: 0, data: { liked: true, likes: 11 } } as Awaited<ReturnType<typeof likeArticle>>);
    await vi.waitFor(() => {
      expect(getArticleLikes(queryClient, firstListKey, 9)).toBe(11);
      expect(queryClient.getQueryData<IArticle>(detailKey)?.likes).toBe(11);
    });

    harness.wrapper.unmount();
  });

  it('restores all cache snapshots when the request fails', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof likeArticle>>>();
    vi.mocked(likeArticle).mockReturnValue(deferred.promise);
    const queryClient = createQueryClient();
    const listKey = articleKeys.list(normalizeArticleListParams({ pageOrder: 'date' }));
    const detailKey = ['articles', 'detail', 9] as const;
    const likedKey = articleKeys.userLiked(42);
    queryClient.setQueryData(listKey, buildInfiniteArticles({ id: 9, likes: 3 }));
    queryClient.setQueryData<IArticle>(detailKey, { id: 9, likes: 3 });
    queryClient.setQueryData<IUserLikedArticlesData>(likedKey, { articleLiked: [9] });
    const harness = mountLikeMutation(queryClient);

    harness.mutation.mutate(9);
    await vi.waitFor(() => {
      expect(getArticleLikes(queryClient, listKey, 9)).toBe(2);
      expect(queryClient.getQueryData<IUserLikedArticlesData>(likedKey)?.articleLiked).toEqual([]);
    });

    deferred.reject(new Error('network'));
    await vi.waitFor(() => {
      expect(getArticleLikes(queryClient, listKey, 9)).toBe(3);
      expect(queryClient.getQueryData<IArticle>(detailKey)?.likes).toBe(3);
      expect(queryClient.getQueryData<IUserLikedArticlesData>(likedKey)?.articleLiked).toEqual([9]);
    });

    harness.wrapper.unmount();
  });

  it('normalizes liked IDs and ignores a duplicate submission while the same article is pending', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof likeArticle>>>();
    vi.mocked(likeArticle).mockReturnValue(deferred.promise);
    const queryClient = createQueryClient();
    const listKey = articleKeys.list(normalizeArticleListParams());
    const likedKey = articleKeys.userLiked(42);
    queryClient.setQueryData(listKey, buildInfiniteArticles({ id: 9, likes: 3 }));
    queryClient.setQueryData<IUserLikedArticlesData>(likedKey, { articleLiked: ['9'] });
    const harness = mountLikeMutation(queryClient);

    harness.mutation.mutate(9);
    harness.mutation.mutate(9);
    await flushPromises();

    expect(likeArticle).toHaveBeenCalledTimes(1);
    expect(getArticleLikes(queryClient, listKey, 9)).toBe(2);
    expect(queryClient.getQueryData<IUserLikedArticlesData>(likedKey)?.articleLiked).toEqual([]);

    deferred.resolve({ code: 0, data: { liked: false, likes: 2 } } as Awaited<ReturnType<typeof likeArticle>>);
    await vi.waitFor(() => expect(harness.mutation.isSuccess.value).toBe(true));
    harness.wrapper.unmount();
  });

  it('rolls back optimistic state when the API returns a non-zero business code', async () => {
    vi.mocked(likeArticle).mockResolvedValue({ code: -1, data: { liked: true, likes: 4 }, msg: 'failed' } as Awaited<ReturnType<typeof likeArticle>>);
    const queryClient = createQueryClient();
    const listKey = articleKeys.list(normalizeArticleListParams());
    const likedKey = articleKeys.userLiked(42);
    queryClient.setQueryData(listKey, buildInfiniteArticles({ id: 9, likes: 3 }));
    queryClient.setQueryData<IUserLikedArticlesData>(likedKey, { articleLiked: [] });
    const harness = mountLikeMutation(queryClient);

    harness.mutation.mutate(9);

    await vi.waitFor(() => expect(harness.mutation.isError.value).toBe(true));
    expect(getArticleLikes(queryClient, listKey, 9)).toBe(3);
    expect(queryClient.getQueryData<IUserLikedArticlesData>(likedKey)?.articleLiked).toEqual([]);
    harness.wrapper.unmount();
  });
});
