import { infiniteQueryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, unref } from 'vue';
import { getList, likeArticle } from '@/service/article/article.request';
import { getLiked } from '@/service/user/user.request';
import useUserStore from '@/stores/user.store';
import { Msg } from '@/utils';

import type { MaybeRefOrGetter, Ref } from 'vue';
import type { RouteParam } from '@/service/types';
import type { IArticle, IArticles } from '@/stores/types/article.result';
import type { IUseArticleListParams } from './types/use-article-list.type';

export type { IUseArticleListParams };

export interface INormalizedArticleListParams {
  pageOrder: string;
  tagId: string | number;
  userId: string | number;
  keywords: string;
  idList: number[];
  pageSize: number;
}

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (params: INormalizedArticleListParams) => [...articleKeys.lists(), params] as const,
  userLiked: (userId: number) => [...articleKeys.all, 'userLiked', userId] as const,
};

export function normalizeArticleListParams(params: IUseArticleListParams = {}): INormalizedArticleListParams {
  return {
    pageOrder: params.pageOrder ?? '',
    tagId: params.tagId ?? '',
    userId: params.userId ?? '',
    keywords: params.keywords ?? '',
    idList: Array.isArray(params.idList) ? params.idList : [],
    pageSize: params.pageSize && params.pageSize > 0 ? params.pageSize : 10,
  };
}

export function articleListInfiniteOptions(params: INormalizedArticleListParams) {
  return infiniteQueryOptions({
    queryKey: articleKeys.list(params),
    queryFn: async ({ pageParam, signal }) => {
      const res = await getList(
        {
          ...params,
          pageNum: pageParam,
        },
        undefined,
        signal,
      );
      return res.data as IArticles;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.total ?? 0;
      const loadedCount = allPages.reduce((count, page) => count + (page.result?.length ?? 0), 0);
      return loadedCount < total ? allPages.length + 1 : undefined;
    },
  });
}

export function useArticleList(
  params: Ref<IUseArticleListParams> | IUseArticleListParams,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const normalizedParams = computed(() => normalizeArticleListParams(unref(params)));
  const query = useInfiniteQuery(
    computed(() => ({
      ...articleListInfiniteOptions(normalizedParams.value),
      enabled: toValue(enabled),
    })),
  );
  const items = computed<IArticle[]>(() => query.data.value?.pages.flatMap((page) => page.result ?? []) ?? []);

  return {
    ...query,
    items,
    normalizedParams,
  };
}

export function useUserLikedArticles() {
  const userStore = useUserStore();
  const userId = computed(() => userStore.userInfo?.id);

  const query = useQuery({
    queryKey: computed(() => articleKeys.userLiked(userId.value || 0)),
    queryFn: async () => {
      if (!userId.value) return { articleLiked: [] as number[] };
      const res = await getLiked(userId.value);
      return res.data;
    },
    enabled: computed(() => !!userId.value),
  });

  const likedArticleIds = computed(() => new Set<number>(query.data.value?.articleLiked ?? []));
  const isLiked = (articleId: number | string) => likedArticleIds.value.has(Number(articleId));

  return {
    ...query,
    likedArticleIds,
    isLiked,
  };
}

export function useLikeArticle(_params?: Ref<IUseArticleListParams> | IUseArticleListParams) {
  const queryClient = useQueryClient();
  const userStore = useUserStore();

  return useMutation({
    mutationFn: (articleId: RouteParam) => likeArticle(articleId),
    onSuccess: (res) => {
      const { liked } = res.data;
      liked ? Msg.showSuccess('已点赞文章') : Msg.showInfo('已取消点赞文章');

      void queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
      if (userStore.userInfo?.id) {
        void queryClient.invalidateQueries({ queryKey: articleKeys.userLiked(userStore.userInfo.id) });
      }
    },
    onError: () => {
      Msg.showFail('操作失败，请重试');
    },
  });
}
