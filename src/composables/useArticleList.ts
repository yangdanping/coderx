import { infiniteQueryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, unref } from 'vue';
import { getList, likeArticle } from '@/service/article/article.request';
import { getLiked } from '@/service/user/user.request';
import useUserStore from '@/stores/user.store';
import { Msg } from '@/utils';
import { normalizeSearchKeyword } from '@/utils/search';

import type { MaybeRefOrGetter, Ref } from 'vue';
import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/vue-query';
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

export interface IUserLikedArticles {
  articleLiked: Array<number | string>;
  [key: string]: unknown;
}

type ArticleId = RouteParam | number | undefined;
type LikesUpdater = number | ((currentLikes: number) => number);

interface IArticleLikeMutationContext {
  listSnapshots: Array<[QueryKey, InfiniteData<IArticles> | undefined]>;
  detailKey: QueryKey;
  detailSnapshot: IArticle | undefined;
  likedKey?: QueryKey;
  likedSnapshot?: IUserLikedArticles;
}

const normalizeArticleId = (articleId: ArticleId) => {
  const rawId = Array.isArray(articleId) ? articleId[0] : articleId;
  return Number(rawId);
};

const resolveLikes = (currentLikes: number | undefined, updater: LikesUpdater) => {
  const normalizedLikes = Number.isFinite(Number(currentLikes)) ? Number(currentLikes) : 0;
  const nextLikes = typeof updater === 'function' ? updater(normalizedLikes) : updater;
  return Math.max(0, Number(nextLikes) || 0);
};

const updateArticleLikes = (article: IArticle, articleId: number, updater: LikesUpdater) => {
  if (Number(article.id) !== articleId) return article;
  return { ...article, likes: resolveLikes(article.likes, updater) };
};

const updateInfiniteArticleLikes = (data: InfiniteData<IArticles> | undefined, articleId: number, updater: LikesUpdater) => {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      result: page.result?.map((article) => updateArticleLikes(article, articleId, updater)),
    })),
  };
};

const isArticleLiked = (data: IUserLikedArticles | undefined, articleId: number) => data?.articleLiked?.some((id) => Number(id) === articleId) ?? false;

const updateLikedArticles = (data: IUserLikedArticles | undefined, articleId: number, liked: boolean): IUserLikedArticles => {
  const normalizedIds = Array.from(new Set((data?.articleLiked ?? []).map(Number).filter(Number.isFinite)));
  const articleLiked = liked ? Array.from(new Set([...normalizedIds, articleId])) : normalizedIds.filter((id) => id !== articleId);
  return { ...(data ?? {}), articleLiked };
};

const setArticleLikesInCaches = (queryClient: QueryClient, articleId: number, updater: LikesUpdater) => {
  queryClient.setQueriesData<InfiniteData<IArticles>>({ queryKey: articleKeys.lists() }, (data) => updateInfiniteArticleLikes(data, articleId, updater));
  queryClient.setQueryData<IArticle>(articleKeys.detail(articleId), (article) => (article ? updateArticleLikes(article, articleId, updater) : article));
};

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (params: INormalizedArticleListParams) => [...articleKeys.lists(), params] as const,
  detail: (articleId: ArticleId) => [...articleKeys.all, 'detail', normalizeArticleId(articleId)] as const,
  userLiked: (userId: number) => [...articleKeys.all, 'userLiked', userId] as const,
};

export function normalizeArticleListParams(params: IUseArticleListParams = {}): INormalizedArticleListParams {
  return {
    pageOrder: params.pageOrder ?? '',
    tagId: params.tagId ?? '',
    userId: params.userId ?? '',
    keywords: normalizeSearchKeyword(params.keywords),
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
      return res.data as IUserLikedArticles;
    },
    enabled: computed(() => !!userId.value),
  });

  const likedArticleIds = computed(() => new Set<number>((query.data.value?.articleLiked ?? []).map(Number).filter(Number.isFinite)));
  const isLiked = (articleId: number | string) => likedArticleIds.value.has(Number(articleId));

  return {
    ...query,
    likedArticleIds,
    isLiked,
  };
}

export function useLikeArticle() {
  const queryClient = useQueryClient();
  const userStore = useUserStore();

  const mutation = useMutation({
    mutationFn: async (articleId: RouteParam) => {
      const res = await likeArticle(articleId);
      if (res.code !== 0) throw new Error(res.msg || '文章点赞失败');
      return res;
    },
    onMutate: async (articleId): Promise<IArticleLikeMutationContext> => {
      const normalizedArticleId = normalizeArticleId(articleId);
      const userId = userStore.userInfo?.id;
      const detailKey = articleKeys.detail(normalizedArticleId);
      const likedKey = userId ? articleKeys.userLiked(userId) : undefined;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: articleKeys.lists() }),
        queryClient.cancelQueries({ queryKey: detailKey }),
        likedKey ? queryClient.cancelQueries({ queryKey: likedKey }) : Promise.resolve(),
      ]);

      const listSnapshots = queryClient.getQueriesData<InfiniteData<IArticles>>({ queryKey: articleKeys.lists() });
      const detailSnapshot = queryClient.getQueryData<IArticle>(detailKey);
      const likedSnapshot = likedKey ? queryClient.getQueryData<IUserLikedArticles>(likedKey) : undefined;
      const optimisticLiked = !isArticleLiked(likedSnapshot, normalizedArticleId);
      const likeDelta = optimisticLiked ? 1 : -1;

      setArticleLikesInCaches(queryClient, normalizedArticleId, (likes) => likes + likeDelta);
      if (likedKey) {
        queryClient.setQueryData<IUserLikedArticles>(likedKey, (data) => updateLikedArticles(data, normalizedArticleId, optimisticLiked));
      }

      return {
        listSnapshots,
        detailKey,
        detailSnapshot,
        likedKey,
        likedSnapshot,
      };
    },
    onSuccess: (res, articleId, context) => {
      const normalizedArticleId = normalizeArticleId(articleId);
      const { liked, likes } = res.data as { liked: boolean; likes: number };

      setArticleLikesInCaches(queryClient, normalizedArticleId, likes);
      if (context.likedKey) {
        queryClient.setQueryData<IUserLikedArticles>(context.likedKey, (data) => updateLikedArticles(data, normalizedArticleId, liked));
      }
      liked ? Msg.showSuccess('已点赞文章') : Msg.showInfo('已取消点赞文章');
    },
    onError: (_error, _articleId, context) => {
      context?.listSnapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.detailSnapshot) {
        queryClient.setQueryData(context.detailKey, context.detailSnapshot);
      }
      if (context?.likedKey) {
        if (context.likedSnapshot) {
          queryClient.setQueryData(context.likedKey, context.likedSnapshot);
        } else {
          queryClient.removeQueries({ queryKey: context.likedKey, exact: true });
        }
      }
      Msg.showFail('操作失败，请重试');
    },
    onSettled: (_data, _error, articleId, context) => {
      void queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: articleKeys.detail(articleId) });
      if (context?.likedKey) void queryClient.invalidateQueries({ queryKey: context.likedKey });
    },
  });

  const mutate = (...args: Parameters<typeof mutation.mutate>) => {
    const [articleId] = args;
    const isSameArticlePending = mutation.isPending.value && normalizeArticleId(mutation.variables.value) === normalizeArticleId(articleId);
    if (isSameArticlePending) return;
    mutation.mutate(...args);
  };

  return {
    ...mutation,
    mutate,
  };
}
