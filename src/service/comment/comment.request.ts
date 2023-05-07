import myRequest from '@/service';
import type { IDataType } from '@/service/types';

const urlHead = '/comment';

export function getComment(articleId) {
  return myRequest.get<IDataType>({
    url: `${urlHead}?articleId=${articleId}`
  });
}

export function addComment(commentInfo) {
  const { articleId, content } = commentInfo;
  return myRequest.post<IDataType>({
    url: `${urlHead}`,
    data: { articleId, content }
  });
}

export function updateComment(commentInfo) {
  const { commentId, content } = commentInfo;
  return myRequest.put<IDataType>({
    url: `${urlHead}/${commentId}`,
    data: { content }
  });
}

export function removeComment(commentId) {
  return myRequest.delete<IDataType>({
    url: `${urlHead}/${commentId}`
  });
}

export function addReply(replyInfo) {
  const { isReplyToComment, articleId, content, commentId, replyId } = replyInfo;
  let url = '';
  let data = {};
  if (isReplyToComment) {
    url = `${urlHead}/${commentId}/reply`;
    data = { articleId, content };
  } else {
    url = !replyId ? `/reply` : `/reply/${replyId}/reply`;
    data = { articleId, commentId, content };
  }
  console.log('addReply数据------------------', { url, data });
  return myRequest.post<IDataType>({ url, data });
}

export function like(likeInfo) {
  const { commentId, replyId } = likeInfo;
  const url = commentId ? `${urlHead}/${commentId}/like` : `/reply/${replyId}/like`;
  return myRequest.post<IDataType>({ url });
}
