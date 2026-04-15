import type { IPage } from '@/service/types';
import type { ArticleStructuredContent } from './article.content';
/**
 * 定义文章
 * @param articleId 文章id
 * @param title 文章标题
 * @param content 文章内容
 */
export interface IArticle {
  articleId?: number;
  title: string;
  content?: string;
  contentJson?: ArticleStructuredContent;
  contentHtml?: string;
  excerpt?: string;
  draftId?: number | null;
}

/**
 * 定义文章列表
 * @param pageNum 页码
 * @param pageSize 页数
 * @param tagId 标签id
 */
export interface IArticleList extends IPage {
  pageOrder: string;
  tagId: number | '';
  userId: number | '';
  keywords: string | '';
  idList: number[] | [];
}
