import myRequest from '@/service';
import type { IDataType } from '@/service/types';
import type { IAccount, ILoginResult } from './user.types';

enum UserAPI {
  LoginUrl = '/user/login'
}

export function userLogin(account: IAccount) {
  // body中的数据存在data中
  return myRequest.post<IDataType>({
    url: UserAPI.LoginUrl,
    data: account
  });
}
