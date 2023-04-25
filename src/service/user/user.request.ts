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

export function getUserInfoById(id: number | string) {
  return myRequest.get<IDataType>({
    url: `${urlHead}/${id}/profile`
  });
}
