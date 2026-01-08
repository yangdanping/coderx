import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转
import { userLogin, userRegister, getUserInfoById, follow, getFollow, updateProfile, reportUser } from '@/service/user/user.request';
import { getCollect, addCollect, addToCollect, removeCollectArticle } from '@/service/collect/collect.request';
import { uploadAvatar, deleteOldAvatar } from '@/service/file/file.request';
import { LocalCache, Msg, emitter, dateFormat } from '@/utils';

import type { IAccount } from '@/service/user/user.types';
import type { IUserInfo, IFollowInfo } from '@/stores/types/user.result';
import type { RouteParam } from '@/service/types';
import useArticleStore from './article.store';
import useRootStore from './index.store';
// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: {} as IUserInfo, //登录用户信息,有读和写权限
    profile: {} as IUserInfo, //其他用户信息,只有读权限
    followInfo: {} as IFollowInfo, // 当前查看的用户详情的关注/粉丝列表
    myFollowInfo: {} as IFollowInfo, // 登录用户的关注/粉丝列表(用于NavBarUser等组件展示)
    collects: [] as any,
    onlineUsers: [] as any[],
    isFollowed: false, //仅用于一对一用户的判断
  }),
  getters: {
    isUserFollowed() {
      return (userId, type: string) => {
        // 若type是粉丝,则查看用户的关注者(following)中是否有该粉丝id
        // 若type是关注者,则直接查看用户的关注者中是否有该id
        const followType = type === 'follower' ? 'following' : type;
        return !!this.followInfo[followType]?.some((item) => item.id === userId);
      };
    },
    followCount() {
      return (type: string) => this.followInfo[type]?.length ?? 0;
    },
    myFollowCount() {
      return (type: string) => this.myFollowInfo[type]?.length ?? 0;
    },
    userOnlineStatus() {
      return (userName: string | undefined) => {
        if (!userName) return { type: 'info', msg: '离线' } as const;
        const user = this.onlineUsers.find((user) => user.userName === userName);
        return user?.status === 'online' ? ({ type: 'success', msg: '在线' } as const) : ({ type: 'info', msg: '离线' } as const);
      };
    },
  },
  actions: {
    updateOnlineUsers(userList) {
      // 将当前用户置顶
      (userList as any[]).find((user, index) => {
        if (user.userName === this.userInfo.name) {
          return userList.unshift(userList.splice(index, 1)[0]);
        }
      });
      this.onlineUsers = userList;
      console.log('当前在线用户列表', this.onlineUsers);
    },
    // 除非用户主动退出登录,否则默认不刷新页面,默认弹出登录框
    logOut(refresh = false) {
      // 1. 断开在线连接
      // 动态导入以避免循环依赖，支持可插拔切换
      try {
        // 优先尝试 Socket.IO 版本
        import('@/service/online/socketio')
          .then((module) => {
            module.default.disconnect();
            console.log('Socket.IO 连接已断开（退出登录）');
          })
          .catch(() => {
            // 如果 Socket.IO 未启用，尝试 WebSocket 版本
            import('@/service/online/websocket')
              .then((module) => {
                module.default.disconnect();
                console.log('WebSocket 连接已断开（退出登录）');
              })
              .catch(() => {
                // 两者都未启用，跳过
                console.log('在线状态功能未启用');
              });
          });
      } catch (error) {
        console.warn('断开在线连接失败:', error);
      }

      // 2. 清除登录状态
      this.token = '';
      this.userInfo = {};
      LocalCache.removeCache('token'); //退出登录要清除token和用户信息
      LocalCache.removeCache('userInfo');
      LocalCache.removeCache('socketUser'); // 清理遗留缓存（如果存在）

      // 3. 刷新页面或直接弹出登录框
      if (refresh) {
        router.go(0);
      } else {
        useRootStore().toggleLoginDialog();
      }
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
          this.userInfo = userInfo;
          LocalCache.setCache('userInfo', userInfo);
          this.token = token;
          LocalCache.setCache('token', token); //注意拿到token第一时间先做缓存,然后就可以在axios实例拦截器中getCache了
          // 3.成功登录后刷新页面-----------------------------------------------------
          LocalCache.getCache('token') ? router.go(0) : Msg.showFail('请求登录用户信息失败'); //若是登录用户信息则不用再请求了
        }
      } else {
        Msg.showFail(res1.msg); //若是登录用户信息则不用再请求了
      }
    },
    async followAction(userId, isFollowListItem = false) {
      console.log('followAction follow', userId);
      const res = await follow(userId); //注意!这个不是登录用户的信息,而是普通用户信息
      console.log('followAction res', res);
      const queryId = !isFollowListItem ? userId : this.userInfo.id;
      if (res.code === 0) {
        Msg.showSuccess('关注成功');
      } else {
        Msg.showWarn('取关成功');
      }
      this.getFollowAction(queryId); //更新关注信息
    },
    async getProfileAction(userId: RouteParam) {
      const res = await getUserInfoById(userId); //注意!这个不是登录用户的信息,而是普通用户信息
      if (res.code === 0) {
        console.log(res.data);
        this.profile = res.data;
      } else {
        Msg.showFail('请求用户信息失败');
      }
    },
    async getCollectAction(userId?: number) {
      const res = await getCollect(userId);
      if (res.code === 0) {
        this.collects = res.data;
        console.log('该用户的收藏夹', this.collects);
      } else {
        Msg.showFail('获取用户收藏夹失败');
      }
    },
    async addCollectAction(collectName) {
      const userId = this.userInfo.id;
      const res = await addCollect(collectName);
      if (res.code === 0) {
        Msg.showSuccess('添加收藏夹成功');
        this.getCollectAction(userId);
      } else {
        Msg.showFail(res.msg);
      }
    },
    async collectAction(payload) {
      const userId = this.userInfo.id;
      const res = await addToCollect(payload);
      console.log('collectAction res', res);
      if (res.code === 0) {
        Msg.showSuccess('新增收藏成功');
        this.getCollectAction(userId);
      } else {
        Msg.showWarn('取消收藏成功');
        this.getCollectAction(userId);
      }
    },
    async getFollowAction(userId) {
      console.log('getFollowAction', userId);
      const res = await getFollow(userId); //注意!这个不是登录用户的信息,而是普通用户信息
      // console.log('getFollowAction', res.data);
      // 若改用户中的follower的id中有当前登录用户的id,则isFollowed为true
      if (res.code === 0) {
        const followInfo = res.data;
        this.followInfo = followInfo;
        const { follower } = followInfo;
        // 若follower为null说明该用户无关注者(无粉丝),isFollowed设为false
        this.isFollowed = follower ? follower.some((item) => item.id === this.userInfo.id) : false;
      } else {
        Msg.showFail('请求用户关注信息失败');
      }
    },
    async getMyFollowAction(userId) {
      // 专门获取登录用户的关注信息，不影响 viewing profile 的数据
      const res = await getFollow(userId);
      if (res.code === 0) {
        this.myFollowInfo = res.data;
      } else {
        // 静默失败或轻提示，避免hover时频繁报错干扰
        console.warn('请求登录用户关注信息失败');
      }
    },
    async uploadAvatarAction(payload) {
      const userId = this.userInfo.id;
      await deleteOldAvatar(userId); //删除原来的头像
      const res = await uploadAvatar(payload);
      console.log('uploadAvatarAction', payload);
      if (res.code === 0) {
        Msg.showSuccess('更换头像成功');
        const res = await getUserInfoById(userId);
        if (res.code === 0) {
          this.userInfo = res.data;
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
    },
    async reportAction(payload) {
      const { userId, report } = payload;
      console.log('reportAction', userId, report);
      const res = await reportUser(userId, report);
      if (res.code === 0) {
        Msg.showSuccess('举报用户成功');
      } else {
        Msg.showFail('举报用户失败');
      }
    },
    async removeCollectArticle(collectId, idList) {
      const res = await removeCollectArticle(collectId, idList);
      if (res.code === 0) {
        if (res.data.collectedArticle) {
          useArticleStore().getArticleListAction({ idList: res.data.collectedArticle });
        } else {
          emitter.emit('clearResultAndBack');
        }
        Msg.showSuccess('移除文章成功!');
      } else {
        Msg.showFail('移除文章失败!');
      }
    },
  },
});

// 与compositionAPI的用法类似
export default useUserStore;
