import myRequest from '@/service';
import type { IResData } from '@/service/types';

const urlHead = '/comment';

export function getComment(data) {
  const { pageNum, pageSize, articleId = '', userId = '' } = data;
  let finalPageNum = pageNum;
  let finalPageSize = pageSize;
  if (!userId) {
    finalPageNum = 1;
    finalPageSize = 100;
  }
  console.log('getComment params', finalPageNum, finalPageSize);
  return myRequest.get<IResData>({
    url: `${urlHead}?pageNum=${finalPageNum}&pageSize=${finalPageSize}&articleId=${articleId}&userId=${userId}`,
  });
}

export function updateComment(commentInfo) {
  const { commentId, content } = commentInfo;
  return myRequest.put<IResData>({
    url: `${urlHead}/${commentId}`,
    data: { content },
  });
}

export function removeComment(commentId) {
  return myRequest.delete<IResData>({
    url: `${urlHead}/${commentId}`,
  });
}

export function addComment(commentInfo) {
  const { articleId, content } = commentInfo;
  return myRequest.post<IResData>({
    url: `${urlHead}`,
    data: { articleId, content },
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
  return myRequest.post<IResData>({ url: `${urlHead}/${commentId}/reply`, data });
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
//   return myRequest.post<IResData>({ url, data });
// }

// export function like(likeInfo) {
//   const { commentId, replyId } = likeInfo;
//   const url = commentId ? `${urlHead}/${commentId}/like` : `/reply/${replyId}/like`;
//   return myRequest.post<IResData>({ url });
// }

export function likeComment(commentId) {
  return myRequest.post<IResData>({
    url: `${urlHead}/${commentId}/like`,
  });
}

export function getCommentById(commentId) {
  return myRequest.get<IResData>({
    url: `${urlHead}/${commentId}`,
  });
}
