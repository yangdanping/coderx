import myRequest from '@/service';
import type { IDataType } from '@/service/types';
import type { IAccount, ILoginResult } from './user.types';
const urlHead = '/user';

export function checkAuth() {
  // body中的数据存在data中
  return myRequest.get<IDataType>({
    url: `${urlHead}/checkAuth`
  });
}

export function userRegister(account: IAccount) {
  return myRequest.post<IDataType>({
    url: `${urlHead}/register`,
    data: account
  });
}

export function userLogin(account: IAccount) {
  return myRequest.post<IDataType<ILoginResult>>({
    url: `${urlHead}/login`,
    data: account
  });
}

export function getUserInfoById(id) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/${id}/profile`
  });
}

export function getLiked(id) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/${id}/like`
  });
}

export function follow(id) {
  return myRequest.post<IDataType>({
    url: `${urlHead}/${id}/follow`
  });
}

export function getFollow(id) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/${id}/follow`
  });
}

export function getArticle(userId, pageNum, pageSize) {
  const offset = pageNum <= 1 ? 0 : (pageNum - 1) * pageSize;
  const limit = pageSize;
  return myRequest.get({
    url: `${urlHead}/${userId}/article?offset=${offset}&limit=${limit}`
  });
}

export function updateProfile(profile) {
  return myRequest.put({
    url: `${urlHead}/profile`,
    data: profile
  });
}
