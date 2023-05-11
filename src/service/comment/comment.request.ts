import myRequest from '@/service';
import type { IDataType } from '@/service/types';

const urlHead = '/comment';

export function getComment(articleId) {
  return myRequest.get<IDataType>({
    url: `${urlHead}?articleId=${articleId}`
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

export function addComment(commentInfo) {
  const { articleId, content } = commentInfo;
  return myRequest.post<IDataType>({
    url: `${urlHead}`,
    data: { articleId, content }
  });
}

export function addReply(replyInfo) {
  const { articleId, content, cid, rid } = replyInfo;
  const data: any = { articleId, content };
  // 大前提:一定有articleId指明评论哪篇文章,一定有cid指明对哪条评论的回复
  // 有rid,说明这次是对回复的回复
  if (rid) {
    data.replyId = cid;
  }
  const commentId = rid ?? cid;
  console.log('addReply数据------------------ data', commentId, data);
  return myRequest.post<IDataType>({ url: `${urlHead}/${commentId}/reply`, data });
}
// export function addReply(replyInfo) {
//   let url = '';
//   let data = {};
//   const { isReplyToComment, articleId, content, commentId, replyId } = replyInfo;
//   if (isReplyToComment) {
//     url = `${urlHead}/${commentId}/reply`;
//     data = { articleId, content };
//   } else {
//     url = !replyId ? `/reply` : `/reply/${replyId}/reply`;
//     data = { articleId, commentId, content };
//   }
//   console.log('addReply数据------------------', { url, data });
//   return myRequest.post<IDataType>({ url, data });
// }

export function like(likeInfo) {
  const { commentId, replyId } = likeInfo;
  const url = commentId ? `${urlHead}/${commentId}/like` : `/reply/${replyId}/like`;
  return myRequest.post<IDataType>({ url });
}
