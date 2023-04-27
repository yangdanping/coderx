import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转
import { userLogin, userRegister, getUserInfoById } from '@/service/user/user.request.js';
import { LocalCache, Msg } from '@/utils';
import type { IAccount } from '@/service/user/user.types';
import type { IUserInfo } from '@/stores/types/user.result';

// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUserStore = defineStore('user', {
  state: () => ({
    token: '' as string,
    userInfo: {} as IUserInfo, //登录用户信息,有读和写权限
    profile: {} as any //其他用户信息,只有读权限
  }),
  actions: {
    changeUserInfo(userInfo: IUserInfo) {
      this.userInfo = userInfo;
    },
    changeToken(token: string) {
      this.token = token;
    },
    logOut(refresh = true) {
      this.token = '';
      this.userInfo = {};
      LocalCache.removeCache('token'); //退出登录要清除token和用户信息
      LocalCache.removeCache('userInfo');
      refresh && router.go(0);
    },
    initProfile() {
      this.profile = {};
    },
    // 异步请求action---------------------------------------------------
    async registerAction(account: IAccount) {
      console.log('registerAction', account);
      const res = await userRegister(account);
      console.log(res);
      if (res.code === 0) {
        console.log('registerAction!!!!!!!!!!', res.data);
        this.loginAction(account); //注册成功后自动登陆
      } else {
        Msg.showFail(res.msg);
      }
    },
    async loginAction(account: IAccount) {
      // 1.实现登录逻辑----------------------
      const res1 = await userLogin(account);
      console.log('loginAction res1', res1);
      if (res1.code === 0) {
        const { id, token } = res1.data; //拿到id,后面要根据该id查询是谁登录了,以获取该用户的信息
        this.token = token;
        Msg.showSuccess('请求登录用户信息成功');
        // 2.根据登录后获取到的用户id请求用户信息
        const res2 = await getUserInfoById(id);
        if (res2.code === 0) {
          const userInfo = res2.data;
          this.changeUserInfo(userInfo);
          LocalCache.setCache('userInfo', userInfo);
          this.changeToken(token);
          LocalCache.setCache('token', token); //注意拿到token第一时间先做缓存,然后就可以在axios实例拦截器中getCache了
          //   // 3.成功登录后刷新页面-----------------------------------------------------
          LocalCache.getCache('token') ? router.go(0) : Msg.showFail('请求登录用户信息失败'); //若是登录用户信息则不用再请求了
        }
      } else {
        Msg.showFail(res1.msg); //若是登录用户信息则不用再请求了
      }
    }
  }
});

// 与compositionAPI的用法类似
export default useUserStore;
