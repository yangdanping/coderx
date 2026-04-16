import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, watch } from 'vue';
import { addView, getDetail } from '@/service/article/article.request';
import useArticleStore from '@/stores/article.store';
import useUserStore from '@/stores/user.store';
import useHistoryStore from '@/stores/history.store';
import { Msg } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';
import type { ArticleIdSource } from './types/use-article-detail.type';

export function useArticleDetail(articleId: ArticleIdSource) {
  const articleStore = useArticleStore();
  const userStore = useUserStore();
  const historyStore = useHistoryStore();
  const currentArticleId = computed(() => toValue(articleId));

  /*
   * ======== 详情主状态来源 ========
   * 1. 文章详情本质上是服务端状态，直接交给 vue-query 管理 pending / success / error。
   * 2. 页面和后续副作用统一读取这一份状态，避免 Pinia 再重复维护 detailStatus。
   */
  const detailQuery = useQuery({
    queryKey: computed(() => ['articles', 'detail', currentArticleId.value]),
    enabled: computed(() => !!currentArticleId.value),
    queryFn: async () => {
      const id = currentArticleId.value;
      const res = await getDetail(id);

      if (res.code !== 0) {
        throw new Error(res.msg || '获取文章详情失败');
      }

      return res.data as IArticle;
    },
  });

  const article = computed<IArticle>(() => detailQuery.data.value ?? {});
  const isDetailReady = computed(() => detailQuery.status.value === 'success' && !!detailQuery.data.value?.id);

  /*
   * ======== 副作用边界 ========
   * 1. queryFn 只负责拿正文详情，保持缓存与重试语义纯净。
   * 2. 浏览量、点赞列表、收藏夹、历史记录都改为 watch 驱动，避免 refetch 时把写操作混进主查询。
   */
  watch(
    currentArticleId,
    (nextArticleId) => {
      articleStore.article = {};

      if (!nextArticleId) return;

      void addView(nextArticleId).catch(() => undefined);
      void articleStore.getUserLikedAction().catch(() => undefined);
    },
    { immediate: true },
  );

  watch(
    () => detailQuery.data.value,
    (detail) => {
      articleStore.article = detail ?? {};
    },
    { immediate: true },
  );

  watch(
    () => detailQuery.status.value,
    (status) => {
      if (status !== 'error') return;
      articleStore.article = {};
      Msg.showFail('获取文章详情失败');
    },
  );

  watch(
    [currentArticleId, isDetailReady],
    ([nextArticleId, ready]) => {
      if (!nextArticleId || !ready || !userStore.userInfo.id) return;

      void userStore.getCollectAction(userStore.userInfo.id).catch(() => undefined);
      void historyStore.addHistoryAction(nextArticleId).catch(() => undefined);
    },
    { immediate: true },
  );

  return {
    ...detailQuery,
    article,
    isDetailReady,
  };
}
