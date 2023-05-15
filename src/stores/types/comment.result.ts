import type { IUserInfo } from '@/stores/types/user.result';
import type { IArticle } from './article.result';

export interface IComment {
  id?: number;
  userId?: number;
  articleId?: number;
  content?: string;
  status?: string;
  rid?: number;
  cid?: number; //被回复的评论id
  likes?: number;
  author?: IUserInfo;
  article?: IArticle;
  cover?: string;
  articleUrl?: string;
  childReply?: IComment[];
  createAt?: string;
  updateAt?: string;
}
