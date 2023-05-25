import myRequest from '@/service';
import type { IArticle, IArticleList } from './article.types';
import type { IDataType, RouteParam } from '@/service/types';
const urlHead = '/article';

export function createArticle(data: IArticle) {
  return myRequest.post<IDataType>({
    url: `${urlHead}`,
    data
  });
}

export function getList(data: IArticleList) {
  const { pageNum, pageSize, tagId, userId, idList, order } = data;
  const offset = pageNum <= 1 ? 0 : (pageNum - 1) * pageSize;
  const limit = pageSize;
  return myRequest.get<IDataType>({
    url: `${urlHead}?offset=${offset}&limit=${limit}&tagId=${tagId}&userId=${userId}&order=${order}&idList=${JSON.stringify(idList)}`
  });
}

export function getDetail(articleId?: RouteParam) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/${articleId}`
  });
}

export function likeArticle(articleId?: RouteParam) {
  return myRequest.post<IDataType>({
    url: `${urlHead}/${articleId}/like`
  });
}

export function updateArticle(data: IArticle) {
  const { articleId, title, content } = data;
  return myRequest.put<IDataType>({
    url: `${urlHead}/${articleId}`,
    data: { title, content }
  });
}

export function removeArticle(articleId: RouteParam) {
  console.log('removeArticle', articleId);
  return myRequest.delete<IDataType>({
    url: `${urlHead}/${articleId}`
  });
}

export function addView(articleId?: RouteParam) {
  console.log('addView 增加浏览量', articleId);
  return myRequest.put<IDataType>({
    url: `${urlHead}/${articleId}/view`
  });
}

export function getTags(offset = 0, limit = 10) {
  return myRequest.get<IDataType>({
    url: `/tag?offset=${offset}&limit=${limit}`
  });
}
export function changeTags(articleId: RouteParam, tags, hasOldTags: any = '') {
  console.log('changeTags!!!!!!!!!!!!!!!!!!!!!', articleId, tags);
  return myRequest.post<IDataType>({
    url: `${urlHead}/${articleId}/tag?hasOldTags=${hasOldTags}`,
    data: { tags }
  });
}

export function search(keywords: string) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/search?keywords=${keywords}`
  });
}

export function getArticleLikedById(articleId) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/${articleId}/like`
  });
}
