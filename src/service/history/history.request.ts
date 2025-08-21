import myRequest from '@/service';
import type { RouteParam } from '@/service/types';

// 获取用户浏览历史
export const getUserHistory = (params: { offset?: number; limit?: number }) => {
  return myRequest.get({
    url: '/history',
    params,
  });
};

// 添加浏览记录
export const addHistory = (articleId?: RouteParam) => {
  return myRequest.post({
    url: '/history',
    data: { articleId },
  });
};

// 删除单个浏览记录
export const deleteHistory = (articleId?: RouteParam) => {
  return myRequest.delete({
    url: `/history/${articleId}`,
  });
};

// 清空用户浏览历史
export const clearUserHistory = () => {
  return myRequest.delete({
    url: '/history',
  });
};

// 检查是否已浏览过该文章
export const hasViewed = (articleId?: RouteParam) => {
  return myRequest.get({
    url: `/history/${articleId}/check`,
  });
};
