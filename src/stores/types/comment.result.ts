export interface IComment {
  id?: number;
  userId?: number;
  articleId?: number;
  commentId?: number; //被回复的评论id
  content?: string;
  createAt?: string;
  updateAt?: string;
}
