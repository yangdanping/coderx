import myRequest from '@/service';
import type { IArticle, IArticleList } from '@/service/article/article.types';
import type { IPage, IResData, RouteParam } from '@/service/types';

const urlHead = '/article';

// 获取文章列表(旧的请求方式需要通过loadingKey来控制loading)
export const getList = (params: IArticleList, loadingKey?: string) => {
  // 原来的多项传参方式
  // const { offset, limit, tagId, userId, idList, pageOrder, keywords } = params;
  // return myRequest.get<IResData>({
  //   url: `${urlHead}?offset=${offset}&limit=${limit}&tagId=${tagId}&userId=${userId}&order=${pageOrder}&idList=${JSON.stringify(idList)}&keywords=${keywords}`,
  // });

  // 现在的多项传参方式
  return myRequest.get<IResData>({
    url: `${urlHead}`,
    params,
    loadingKey,
  });
};

// 获取文章详情
export const getDetail = (articleId?: RouteParam) => {
  return myRequest.get<IResData>({
    url: `${urlHead}/${articleId}`,
  });
};

// 创建文章
export const createArticle = (data: IArticle) => {
  return myRequest.post<IResData>({
    url: `${urlHead}`,
    data,
  });
};

// 点赞文章
export const likeArticle = (articleId?: RouteParam) => {
  return myRequest.post<IResData>({
    url: `${urlHead}/${articleId}/like`,
  });
};

// 更新文章
export const updateArticle = (data: IArticle) => {
  const { articleId, title, content } = data;
  return myRequest.put<IResData>({
    url: `${urlHead}/${articleId}`,
    data: { title, content },
  });
};

// 删除文章
export const removeArticle = (articleId: RouteParam) => {
  return myRequest.delete<IResData>({
    url: `${urlHead}/${articleId}`,
  });
};

// 增加文章浏览量
export const addView = (articleId?: RouteParam) => {
  return myRequest.put<IResData>({
    url: `${urlHead}/${articleId}/view`,
  });
};

// 获取文章标签
export const getTags = (params?: IPage) => {
  return myRequest.get<IResData>({
    url: `/tag`,
    params,
  });
};

// 修改文章标签
export const changeTags = (articleId: RouteParam, tags: string[]) => {
  console.log('changeTags', articleId, tags);
  return myRequest.post<IResData>({
    url: `${urlHead}/${articleId}/tag`,
    data: { tags },
  });
};

// 搜索文章
export const search = (keywords: string, signal?: AbortSignal) => {
  return myRequest.get<IResData>({
    url: `${urlHead}/search`,
    params: { keywords },
    signal,
  });
};

// 获取文章点赞信息
export const getArticleLikedById = (articleId) => {
  return myRequest.get<IResData>({
    url: `${urlHead}/${articleId}/like`,
  });
};

// 获取文章推荐
export const getRecommend = (params?: IPage) => {
  return myRequest.get<IResData>({
    url: `${urlHead}/recommend`,
    params,
  });
};
