import { defineStore } from 'pinia';
import { userLogin } from '@/service/user/user.request.js';
import { LocalCache } from '@/utils';
import type { IAccount } from '@/service/user/user.types';

// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    account: {},
    userInfo: {},
    showLoginDialog: false
  }),
  actions: {
    changeLoginDialog() {
      this.showLoginDialog = !this.showLoginDialog;
    },
    async loginAction(account: IAccount) {
      // 1.实现登录逻辑----------------------
      const res1 = await userLogin(account);
      console.log('loginAction res1', res1);

      if (res1.code === 0) {
        const { id, name } = res1.data; //拿到id,后面要根据该id查询是谁登录了,以获取该用户的信息
        const { token } = res1;
        this.account = { id, name };
        this.token = token;
        // 2.根据登录后获取到的用户id请求用户信息
        // const res2 = await getUserInfo(id);
        // if (res2.code === 0) {
        //   commit('changeUserInfo', res2.data);
        //   LocalCache.setCache('userInfo', res2.data);
        //   commit('changeToken', token);
        //   LocalCache.setCache('token', token); //注意拿到token第一时间先做缓存,然后就可以在axios实例拦截器中getCache了
        //   // 3.成功登录后刷新页面-----------------------------------------------------
        //   LocalCache.getCache('token') ? router.go(0) : console.log('登录(授权)失败');
        // } else {
        //   Msg.showFail('请求登录用户信息失败'); //若是登录用户信息则不用再请求了
        // }
      } else {
        // Msg.showFail(res1.msg); //若是登录用户信息则不用再请求了
      }
    }
  }
});

// 与compositionAPI的用法类似
export default useUserStore;
