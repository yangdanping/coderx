import type { IUserInfo } from '@/stores/types/user.result';

export interface IComment {
  id?: number;
  userId?: number;
  articleId?: number;
  content?: string;
  status?: string;
  rid?: number;
  cid?: number; //被回复的评论id
  likes?: number;
  user?: IUserInfo;
  childReply?: IComment[];
  createAt?: string;
  updateAt?: string;
}
