import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转
import { checkAuth, userLogin, userRegister, getUserInfoById } from '@/service/user/user.request.js';
import { LocalCache, Msg } from '@/utils';
import type { IAccount } from '@/service/user/user.types';

// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: {},
    showLoginDialog: false
  }),
  actions: {
    changeLoginDialog() {
      this.showLoginDialog = !this.showLoginDialog;
    },
    changeUserInfo(userInfo: any) {
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
    async registerAction(account: IAccount) {
      console.log('registerAction', account);
      const res = await userRegister(account);
      console.log(res);
      if (res.code === 0) {
        console.log('registerAction!!!!!!!!!!', res.data);
        this.loginAction(account); //注册成功后自动登陆
        // eventBus.$emit('registerSuccess');
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
    },
    async checkAuthAction() {
      const res = await checkAuth();
      console.log('checkAuthAction res', res);
      res.code && this.logOut(false);
    },
    async loadLoginAction() {
      const token = LocalCache.getCache('token');
      token && this.changeToken(token);
      const userInfo = LocalCache.getCache('userInfo');
      userInfo && this.changeUserInfo(userInfo);
    }
  }
});

// 与compositionAPI的用法类似
export default useUserStore;
