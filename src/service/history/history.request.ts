import myRequest from '@/service';
import type { RouteParam, IResData, IPage } from '@/service/types';

const urlHead = '/history';

// 获取用户浏览历史
export const getUserHistory = (params: IPage) => {
  return myRequest.get<IResData>({
    url: `${urlHead}`,
    params,
  });
};

// 添加浏览记录
export const addHistory = (articleId?: RouteParam) => {
  return myRequest.post<IResData>({
    url: `${urlHead}`,
    data: { articleId },
  });
};

// 删除单个浏览记录
export const deleteHistory = (articleId?: RouteParam) => {
  return myRequest.delete<IResData>({
    url: `${urlHead}/${articleId}`,
  });
};

// 清空用户浏览历史
export const clearUserHistory = () => {
  return myRequest.delete<IResData>({
    url: `${urlHead}`,
  });
};

// 检查是否已浏览过该文章
export const hasViewed = (articleId?: RouteParam) => {
  return myRequest.get<IResData>({
    url: `${urlHead}/${articleId}/check`,
  });
};
