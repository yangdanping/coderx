/**
 * 定义文章
 * @param articleId 文章id
 * @param title 文章标题
 * @param content 文章内容
 */
export interface IArticle {
  articleId?: number;
  title: string;
  content: string;
}

/**
 * 定义文章列表
 * @param pageNum 页码
 * @param pageSize 页数
 * @param tagId 标签id
 */
export interface IArticleList {
  pageNum: number;
  pageSize: number;
  tagId: string | number;
}
