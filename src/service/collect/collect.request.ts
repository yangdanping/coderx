import myRequest from '@/service';
import type { IResData } from '@/service/types';

const urlHead = '/collect';

export function getCollect(userId, pageNum = 1, pageSize = 10) {
  console.log('getCollect', userId);
  return myRequest.get<IResData>({
    url: `${urlHead}/${userId}?pageNum=${pageNum}&pageSize=${pageSize}`,
  });
}

export function addCollect(collectName) {
  return myRequest.post<IResData>({
    url: `${urlHead}`,
    data: {
      name: collectName,
    },
  });
}

export function addToCollect({ collectId, articleId }) {
  return myRequest.post<IResData>({
    url: `${urlHead}/${collectId}`,
    data: {
      articleId,
    },
  });
}

export function removeCollectArticle(collectId, idList) {
  return myRequest.delete<IResData>({
    url: `${urlHead}/${collectId}?idList=${JSON.stringify(idList)}`,
  });
}
