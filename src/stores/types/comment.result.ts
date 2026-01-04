import type { IUserInfo } from '@/stores/types/user.result';
import type { IArticle } from './article.result';

// ==================== 类型定义 ====================

/** 评论作者信息 */
export interface ICommentAuthor {
  id: number;
  name: string;
  avatarUrl: string | null;
}

/** 被回复的用户信息 */
export interface IReplyTo {
  id: number;
  name: string;
  content?: string; // 被回复的内容
}

/** 单条评论/回复 */
export interface IComment {
  id: number;
  content: string;
  status: number;
  cid: number | null; // 父评论ID
  rid: number | null; // 被回复的回复ID
  articleId?: number;
  createAt: string;
  author: ICommentAuthor;
  likes: number;
  replyCount?: number; // 回复数（仅一级评论有）
  replies?: IComment[]; // 回复预览（仅一级评论有）
  replyTo?: IReplyTo | null; // 被回复的用户（仅回复有）
  // 兼容旧版字段
  userId?: number;
  tags?: any[];
  title?: string;
  article?: IArticle;
  cover?: string;
  articleUrl?: string;
}

/** 一级评论列表响应 */
export interface ICommentListResponse {
  items: IComment[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

/** 回复列表响应 */
export interface IRepliesResponse {
  items: IComment[];
  nextCursor: string | null;
  hasMore: boolean;
  replyCount: number;
}

/** 新增评论响应 */
export interface IAddCommentResponse {
  comment: IComment;
  totalCount: number;
}

/** 新增回复响应 */
export interface IAddReplyResponse {
  reply: IComment;
  totalCount: number;
}

/** 删除评论响应 */
export interface IDeleteCommentResponse {
  deletedComment: IComment;
  totalCount: number;
}
