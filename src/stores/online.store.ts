import { acceptHMRUpdate, defineStore } from 'pinia';
import { LocalCache } from '@/utils';

import type { IOnlineUser, IUserInfo } from '@/stores/types/user.result';

const useOnlineStore = defineStore('online', {
  state: () => ({
    onlineUsers: [] as IOnlineUser[],
  }),
  getters: {
    userOnlineStatusByUserId(): (userId: number | string | undefined) => { type: 'success' | 'info'; msg: string } {
      return (userId: number | string | undefined) => {
        if (userId === undefined || userId === '') {
          return { type: 'info', msg: '离线' } as const;
        }
        const id = String(userId);
        const user = this.onlineUsers.find((u) => String(u.userId) === id);
        return user?.status === 'online' ? ({ type: 'success', msg: '在线' } as const) : ({ type: 'info', msg: '离线' } as const);
      };
    },
  },
  actions: {
    /**
     * 应用服务端广播的在线列表；将当前登录用户（LocalCache.userInfo）置顶
     */
    applyOnlineUserList(rawList: IOnlineUser[]) {
      const list = rawList.map((u) => ({
        ...u,
        userId: u.userId != null ? String(u.userId) : '',
        userName: u.userName,
        avatarUrl: u.avatarUrl ?? '',
        status: u.status ?? 'online',
        connectedAt: u.connectedAt,
      }));
      const cached = LocalCache.getCache('userInfo') as IUserInfo | undefined;
      if (cached?.id != null) {
        const sid = String(cached.id);
        const idx = list.findIndex((u) => u.userId === sid);
        if (idx > 0) {
          const [me] = list.splice(idx, 1);
          list.unshift(me);
        }
      } else if (cached?.name) {
        const idx = list.findIndex((u) => u.userName === cached.name);
        if (idx > 0) {
          const [me] = list.splice(idx, 1);
          list.unshift(me);
        }
      }
      this.onlineUsers = list;
    },
    clearOnlineUsers() {
      this.onlineUsers = [];
    },
    /** 退出登录等场景：断开 Socket.IO / WebSocket 在线通道（可插拔） */
    async disconnectAllTransports() {
      try {
        const socketio = await import('@/service/online/socketio');
        socketio.default.disconnect();
      } catch {
        /* 未启用或加载失败则忽略 */
      }
      try {
        const ws = await import('@/service/online/websocket');
        ws.default.disconnect();
      } catch {
        /* ignore */
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useOnlineStore, import.meta.hot));
}

export default useOnlineStore;
