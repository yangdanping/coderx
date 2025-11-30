import myRequest from '@/service';
import type { IResData } from '@/service/types';
import type { IComment, ICommentListResponse, IRepliesResponse, IAddCommentResponse, IAddReplyResponse, IDeleteCommentResponse } from '@/stores/types/comment.result';

export type { IComment, ICommentListResponse, IRepliesResponse };

const urlHead = '/comment';

// ==================== 请求函数 ====================

/**
 * 获取一级评论列表（分页）
 */
export function getCommentList(params: { articleId: string; cursor?: string | null; limit?: number }) {
  const { articleId, cursor, limit = 5 } = params;
  let url = `${urlHead}?articleId=${articleId}&limit=${limit}`;
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }
  return myRequest.get<IResData<ICommentListResponse>>({ url });
}

/**
 * 获取用户历史评论列表（分页）
 */
export function getUserCommentList(params: { userId: number; pageNum: number; pageSize: number }) {
  const { userId, pageNum, pageSize } = params;
  return myRequest.get<IResData<IComment[]>>({
    url: `${urlHead}?userId=${userId}&pageNum=${pageNum}&pageSize=${pageSize}`,
  });
}

/**
 * 获取某条评论的回复列表（分页）
 */
export function getReplies(params: { commentId: number; cursor?: string | null; limit?: number }) {
  const { commentId, cursor, limit = 10 } = params;
  let url = `${urlHead}/${commentId}/replies?limit=${limit}`;
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }
  return myRequest.get<IResData<IRepliesResponse>>({ url });
}

/**
 * 获取评论总数
 */
export function getCommentCount(articleId: string) {
  return myRequest.get<IResData<{ totalCount: number }>>({
    url: `${urlHead}/count?articleId=${articleId}`,
  });
}

/**
 * 获取单条评论
 */
export function getCommentById(commentId: number) {
  return myRequest.get<IResData<IComment>>({
    url: `${urlHead}/${commentId}`,
  });
}

/**
 * 新增一级评论
 */
export function addComment(data: { articleId: string; content: string }) {
  return myRequest.post<IResData<IAddCommentResponse>>({
    url: urlHead,
    data,
  });
}

/**
 * 回复评论
 * @param commentId 被回复的一级评论ID
 * @param data.articleId 文章ID
 * @param data.content 回复内容
 * @param data.replyId 被回复的回复ID（如果是回复的回复）
 */
export function addReply(commentId: number, data: { articleId: string; content: string; replyId?: number }) {
  return myRequest.post<IResData<IAddReplyResponse>>({
    url: `${urlHead}/${commentId}/reply`,
    data,
  });
}

/**
 * 点赞评论
 */
export function likeComment(commentId: number) {
  return myRequest.post<IResData<{ liked: boolean; likes: number }>>({
    url: `${urlHead}/${commentId}/like`,
  });
}

/**
 * 修改评论
 */
export function updateComment(commentId: number, content: string) {
  return myRequest.put<IResData<IComment>>({
    url: `${urlHead}/${commentId}`,
    data: { content },
  });
}

/**
 * 删除评论
 */
export function deleteComment(commentId: number) {
  return myRequest.delete<IResData<IDeleteCommentResponse>>({
    url: `${urlHead}/${commentId}`,
  });
}
