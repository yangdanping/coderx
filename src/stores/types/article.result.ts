import type { ArticleStructuredContent } from '@/service/article/article.content';
import type { IUserInfo } from './user.result';

export interface IArticles {
  result?: IArticle[];
  total?: number;
}

export interface IArticle {
  id?: number;
  title?: string;
  content?: string;
  contentJson?: ArticleStructuredContent;
  contentHtml?: string;
  excerpt?: string;
  articleUrl?: string;
  author?: IAuthor;
  cover?: string;
  images?: IArticleImg[];
  videos?: IArticleVideo[];
  tags?: Itag[];
  likes?: number;
  commentCount?: number;
  status?: string;
  views?: number;
  createAt?: string;
  updateAt?: string;
}

export interface IArticleImg {
  id?: number;
  url?: string;
}
export interface IArticleVideo {
  id?: number;
  url?: string;
}
export interface IAuthor extends IUserInfo {
  id?: number;
  sex?: string;
  name?: string;
  career?: string;
  avatarUrl?: string;
}
export interface Itag {
  id?: number;
  name?: string;
}
