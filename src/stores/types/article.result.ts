import type { IUserInfo } from './user.result';

export interface IArticles {
  result?: IArticle[];
  total?: number;
}

export interface IArticle {
  id?: number;
  title?: string;
  content?: string;
  articleUrl?: string;
  author?: IAuthor;
  cover?: string;
  images?: IArticleImg[];
  tags?: any[];
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
