import type { IArticle } from '@/stores/types/article.result';

/** 列表项数据类型 - 兼容文章和评论的通用属性 */
export interface IListItemData {
  id?: number;
  title?: string;
  content?: string;
  excerpt?: string;
  articleUrl?: string;
  author?: { id?: number; name?: string; avatarUrl?: string | null };
  cover?: string;
  tags?: { name?: string }[];
  createAt?: string;
  article?: IArticle;
}
