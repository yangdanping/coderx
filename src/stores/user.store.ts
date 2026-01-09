import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转
import { userLogin, userRegister, getUserInfoById, follow, getFollow, updateProfile, reportUser } from '@/service/user/user.request';
import { getCollect, addCollect, addToCollect, removeCollectArticle } from '@/service/collect/collect.request';
import { uploadAvatar, deleteOldAvatar } from '@/service/file/file.request';
import { LocalCache, Msg, emitter, dateFormat } from '@/utils';

import type { IAccount } from '@/service/user/user.types';
import type { IUserInfo, IFollowInfo, ICacheEntry } from '@/stores/types/user.result';
import type { RouteParam } from '@/service/types';
import useArticleStore from './article.store';
import useRootStore from './index.store';

// 缓存过期时间：30秒内重复 hover 同一用户不会重新请求
const CACHE_TTL = 30 * 1000;

// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: {} as IUserInfo, //登录用户信息,有读和写权限
    profile: {} as IUserInfo, //其他用户信息,只有读权限
    // ============ 关注信息缓存 Map ============
    // 使用 Map 按 userId 分别存储每个用户的关注信息，避免 hover 不同用户时状态互相覆盖
    followInfoCache: new Map<number, ICacheEntry<IFollowInfo>>(),
    // 记录正在请求中的 userId，防止同一用户并发重复请求
    pendingFollowRequests: new Set<number>(),
    myFollowInfo: {} as IFollowInfo, // 登录用户的关注/粉丝列表(用于NavBarUser等组件展示)
    collects: [] as any,
    onlineUsers: [] as any[],
  }),
  getters: {
    // ============ 按 userId 获取关注信息（解决状态闪烁问题）============
    // 从缓存 Map 中获取指定用户的关注信息
    getFollowInfoById(): (userId: number | undefined) => IFollowInfo | null {
      return (userId: number | undefined) => {
        if (userId === undefined) return null;
        const cached = this.followInfoCache.get(userId);
        // 返回缓存数据（不检查过期，过期逻辑在请求时处理）
        return cached?.data ?? null;
      };
    },
    // 判断当前登录用户是否关注了指定用户（用于 Avatar hover 弹窗）
    isFollowedById(): (targetUserId: number | undefined) => boolean {
      return (targetUserId: number | undefined) => {
        if (targetUserId === undefined) return false;
        const info = this.followInfoCache.get(targetUserId)?.data;
        // 如果目标用户的粉丝列表中包含当前登录用户的 id，则表示已关注
        return info?.follower?.some((item) => item.id === this.userInfo.id) ?? false;
      };
    },
    // 获取指定用户的关注数/粉丝数（用于 Avatar hover 弹窗）
    followCountById(): (userId: number | undefined, type: 'following' | 'follower') => number {
      return (userId: number | undefined, type: 'following' | 'follower') => {
        if (userId === undefined) return 0;
        const info = this.followInfoCache.get(userId)?.data;
        return info?.[type]?.length ?? 0;
      };
    },
    // ============ 原原有 getters（用于 UserFollow 列表页）============
    // 用于 UserFollowItem 判断列表中每个用户是否被关注
    isUserFollowed(): (userId: number | undefined, type: string) => boolean {
      return (userId: number | undefined, type: string) => {
        if (userId === undefined) return false;
        // 获取当前查看的用户详情页的关注信息
        const profileId = this.profile?.id;
        if (!profileId) return false;
        const info = this.followInfoCache.get(profileId)?.data;
        // 若type是粉丝,则查看用户的关注者(following)中是否有该粉丝id
        const followType = type === 'follower' ? 'following' : type;
        return !!info?.[followType]?.some((item) => item.id === userId);
      };
    },
    // 获取当前查看的用户详情页的关注数/粉丝数
    followCount(): (type: string) => number {
      return (type: string) => {
        const profileId = this.profile?.id;
        if (!profileId) return 0;
        const info = this.followInfoCache.get(profileId)?.data;
        return info?.[type]?.length ?? 0;
      };
    },
    // 获取当前查看的用户详情页的关注信息（用于 UserFollow 列表）
    followInfo(): IFollowInfo {
      const profileId = this.profile?.id;
      if (!profileId) return {} as IFollowInfo;
      return this.followInfoCache.get(profileId)?.data ?? ({} as IFollowInfo);
    },
    // 判断当前登录用户是否关注了当前查看的用户详情页用户
    isFollowed(): boolean {
      const profileId = this.profile?.id;
      if (!profileId) return false;
      const info = this.followInfoCache.get(profileId)?.data;
      return info?.follower?.some((item) => item.id === this.userInfo.id) ?? false;
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
      // 关注/取关后使相关用户的缓存失效，强制下次请求刷新
      this.invalidateFollowCache(userId);
      this.invalidateFollowCache(queryId);
      this.getFollowAction(queryId, true); //更新关注信息，强制刷新
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
    /**
     * 获取用户关注信息（带缓存）
     * @param userId - 目标用户 ID
     * @param forceRefresh - 是否强制刷新（跳过缓存检查）
     */
    async getFollowAction(userId: number, forceRefresh = false) {
      console.log('getFollowAction', userId, { forceRefresh });

      // ============ 步骤1：检查缓存是否有效 ============
      if (!forceRefresh) {
        const cached = this.followInfoCache.get(userId);
        const now = Date.now();
        // 如果缓存存在且未过期（在 CACHE_TTL 时间内），直接使用缓存数据
        if (cached && now - cached.timestamp < CACHE_TTL) {
          console.log('使用缓存的关注信息', userId);
          return; // 缓存有效，无需请求
        }
      }

      // ============ 步骤2：防止并发重复请求 ============
      // 如果同一个用户的请求正在进行中，跳过本次请求
      if (this.pendingFollowRequests.has(userId)) {
        console.log('请求进行中，跳过重复请求', userId);
        return;
      }

      // ============ 步骤3：发起网络请求 ============
      // 标记该用户正在请求中
      this.pendingFollowRequests.add(userId);

      try {
        const res = await getFollow(userId);
        if (res.code === 0) {
          const followInfo = res.data;
          // 将数据存入缓存 Map，同时记录时间戳
          this.followInfoCache.set(userId, {
            data: followInfo,
            timestamp: Date.now(),
          });
          console.log('关注信息已缓存', userId);
        } else {
          Msg.showFail('请求用户关注信息失败');
        }
      } finally {
        // 无论成功失败，都移除"请求中"标记
        this.pendingFollowRequests.delete(userId);
      }
    },
    /**
     * 使指定用户的关注信息缓存失效
     * 用于关注/取关操作后强制刷新数据
     */
    invalidateFollowCache(userId: number) {
      this.followInfoCache.delete(userId);
      console.log('缓存已失效', userId);
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
