import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转
import { userLogin, userRegister, getUserInfoById, follow, getFollow, getArticle, updateProfile } from '@/service/user/user.request.js';
import { uploadAvatar } from '@/service/file/file.request.js';
import useRootStore from '@/stores';
import { LocalCache, Msg, timeFormat } from '@/utils';

import type { IAccount } from '@/service/user/user.types';
import type { IUserInfo, IFollowInfo } from '@/stores/types/user.result';
import type { RouteParam } from '@/service/types';
import type { IArticle } from './types/article.result';

// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: {} as IUserInfo, //登录用户信息,有读和写权限
    profile: {} as IUserInfo, //其他用户信息,只有读权限
    followInfo: {} as IFollowInfo,
    articles: [] as IArticle[],
    comments: [],
    collects: [],
    isFollowed: false
  }),
  getters: {
    isUser() {
      return (userId) => this.token && userId === this.userInfo.id; //判断是否是当前已登陆用户
    },
    isUserFollowed() {
      return (userId, type: string) => this.followInfo[type]?.some((item) => item.id === userId);
    }
  },
  actions: {
    changeToken(token: string) {
      this.token = token;
    },
    changeUserInfo(userInfo: IUserInfo) {
      this.userInfo = userInfo;
    },
    changeProfile(profile: IUserInfo) {
      this.profile = profile;
    },
    changeArticle(articles) {
      articles.forEach((article) => (article.createAt = timeFormat(article.createAt)));
      this.articles = articles;
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
    changeFollowInfo(payload) {
      this.followInfo = payload;
      const { follower } = payload;
      // 若follower为null说明该用户无关注者,isFollowed设为false
      this.isFollowed = follower ? follower.some((item) => item.id === this.userInfo.id) : false;
      // bug问题可能出现在this.isFollowed不适用于列表中
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
    },
    async followAction(userId) {
      console.log('followAction follow', userId);
      const res = await follow(userId); //注意!这个不是登录用户的信息,而是普通用户信息
      if (res.code === 0) {
        this.getFollowAction(userId); //更新关注信息
        Msg.showSuccess('关注成功');
      } else {
        this.getFollowAction(userId); //更新关注信息
        Msg.showWarn('取关成功');
      }
    },
    async getProfileAction(userId: RouteParam) {
      const res = await getUserInfoById(userId); //注意!这个不是登录用户的信息,而是普通用户信息
      if (res.code === 0) {
        this.changeProfile(res.data);
        this.getArticleAction(res.data.id);
      } else {
        Msg.showFail('请求用户信息失败');
      }
    },
    async getArticleAction(userId) {
      const { pageNum, pageSize } = useRootStore();
      const res = await getArticle(userId, pageNum, pageSize);
      res.code === 0 ? this.changeArticle(res.data) : Msg.showFail('获取用户发表文章失败');
    },
    async getCommentAction(userId) {
      console.log('getCommentAction', userId);
    },
    async getCollectAction(userId) {
      console.log('getCollectAcion', userId);
    },
    async reportAction(payload) {
      console.log('reportAction', payload);
    },
    async getFollowAction(userId) {
      const res = await getFollow(userId); //注意!这个不是登录用户的信息,而是普通用户信息
      console.log('getFollowAction', res.data);
      // 若改用户中的follower的id中有当前登录用户的id,则isFollowed为true
      res.code === 0 ? this.changeFollowInfo(res.data) : Msg.showFail('请求用户关注信息失败');
    },
    async uploadAvatarAction(payload) {
      const userId = this.userInfo.id;
      const res = await uploadAvatar(payload);
      console.log('uploadAvatarAction', payload);
      if (res.code === 0) {
        Msg.showSuccess('更换头像成功');
        const res = await getUserInfoById(userId);
        if (res.code === 0) {
          this.changeUserInfo(res.data);
          LocalCache.setCache('userInfo', res.data);
          router.go(0);
        } else {
          Msg.showFail('请求用户信息失败');
        }
      } else {
        Msg.showFail('更换头像失败');
      }
    },
    async updateProfileAction(form) {
      console.log('updateProfileAction form.value', form);
      const res = await updateProfile(form);
      res.code === 0 ? router.go(0) : Msg.showFail('修改信息失败');
    }
  }
});

// 与compositionAPI的用法类似
export default useUserStore;
