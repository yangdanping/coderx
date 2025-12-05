import { useInfiniteQuery } from '@tanstack/vue-query';
import { getList } from '@/service/article/article.request';
import { unref } from 'vue';
import type { Ref } from 'vue';
import type { IArticleList } from '@/service/article/article.types';

// 定义参数类型，继承自原有的请求参数类型
// 注意：这里不需要包含 offset/limit/pageNum，因为这些由 useInfiniteQuery 内部管理
export interface IUseArticleListParams extends Omit<IArticleList, 'pageNum' | 'pageSize'> {
  pageSize?: number;
}

/**
 * Composable: 文章列表逻辑封装
 * 作用：替代 Store 中的 loadMoreAction, hasMore, loading 等状态管理
 *
 * @param params 响应式参数对象。当内部属性变化时（如 keywords），TanStack Query 会自动重置并重新请求
 * @param initialPageNum 初始页码，默认为 1
 */
// 1. Query Key (查询键) 类似于 Vue 的 watch 依赖。
// 当 params 中的任何属性变化时（比如 keywords 变了），
// TanStack Query 会自动认为这是个"新查询"，从而：
// 1. 取消正在进行的旧请求
// 2. 清空旧数据 (data.pages)
// 3. 重置 pageParam 为 initialPageParam
// 4. 重新发起第一页请求
// 所谓的“优化了缓存策略”体现在：
// 自动缓存：当用户在“最新”和“热门”之间切换时，TanStack Query 会在内存中保留之前的数据。
// 无感切换：如果切走再切回来（在一定时间内），组件会直接渲染缓存的数据，而不是像以前那样必须显示 Skeleton 骨架屏等待 Loading。
// Stale-While-Revalidate：它采用“先显示旧数据，后台静默更新”的策略，体验比单纯的“清空 -> Loading -> 显示”要流畅得多。
// 这个 queryKey 就是缓存的"钥匙"
export function useArticleList(params: Ref<IUseArticleListParams> | IUseArticleListParams) {
  // 使用 useInfiniteQuery 处理无限滚动逻辑
  return useInfiniteQuery({
    queryKey: ['articles', params],
    // 2. Query Function (查询函数)
    // 接收 pageParam（当前页码），调用实际的 Service 层接口
    queryFn: async ({ pageParam = 1 }) => {
      const currentParams = unref(params);
      // 清理参数中的 undefined/null/空字符串，避免 URL 过长或参数混乱
      const cleanParams = Object.fromEntries(Object.entries(currentParams).filter(([_, v]) => v !== undefined && v !== null && v !== ''));

      // 这里执行原本 Store 里的参数组装逻辑
      const res = await getList({
        pageOrder: '',
        tagId: '',
        userId: '',
        keywords: '',
        idList: [],
        ...cleanParams,
        pageNum: pageParam as number,
        pageSize: currentParams.pageSize || 10, // 默认 pageSize
      });

      // 注意：这里直接返回 data，不需要像 Store 那样手动拼接数组
      return res.data;
    },

    // 3. Initial Page Param (初始页码)
    initialPageParam: 1,

    // 4. Get Next Page Param (计算下一页页码),替代了 Store 里的 `hasMore` 判断和 `pageNum + 1` 逻辑
    // lastPage: 刚刚请求回来的那一页数据
    // allPages: 目前已加载的所有页数据数组
    getNextPageParam: (lastPage, allPages) => {
      const currentListLength = lastPage.result?.length ?? 0;
      const total = lastPage.total ?? 0;

      // 计算目前已加载的文章总数
      // allPages 是数组的数组: [{result: [...], total: 100}, {result: [...], total: 100}]
      const loadedCount = allPages.flatMap((page) => page.result ?? []).length;

      // 如果已加载数量 >= 总数，说明没有下一页了，返回 undefined 停止加载
      if (loadedCount >= total) {
        return undefined;
      }

      // 否则，下一页页码 = 当前页数 + 1 (假设从1开始)
      return allPages.length + 1;
    },
  });
}
