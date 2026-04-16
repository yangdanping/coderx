import type { IArticleList } from '@/service/article/article.types';

/** useArticleList 入参：继承列表请求字段，分页由 useInfiniteQuery 管理故省略 pageNum/pageSize 必填语义 */
export interface IUseArticleListParams extends Partial<Omit<IArticleList, 'pageNum' | 'pageSize'>> {
  pageSize?: number;
}
