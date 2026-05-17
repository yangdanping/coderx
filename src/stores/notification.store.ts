import { acceptHMRUpdate, defineStore } from 'pinia';
import {
  getNotificationList,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/service/notification/notification.request';
import { Msg } from '@/utils';
import type { INotification, INotificationState } from '@/stores/types/notification.result';
import type { RouteParam } from '@/service/types';

const useNotificationStore = defineStore('notification', {
  state: (): INotificationState => ({
    notificationList: [],
    unreadCount: 0,
    pageSize: 20,
    loading: false,
    unreadLoading: false,
  }),

  actions: {
    async refreshAction(reset = true) {
      await Promise.all([this.getNotificationListAction(reset), this.getUnreadCountAction()]);
    },

    async getNotificationListAction(reset = false) {
      this.loading = true;
      try {
        const offset = reset ? 0 : this.notificationList.length;
        const res = await getNotificationList({
          offset,
          limit: this.pageSize,
        });

        if (res.code === 0) {
          if (reset) {
            this.notificationList = res.data;
          } else {
            this.notificationList.push(...res.data);
          }
        } else {
          Msg.showFail('获取消息列表失败');
        }
      } catch (error) {
        Msg.showFail('获取消息列表失败');
      } finally {
        this.loading = false;
      }
    },

    async getUnreadCountAction() {
      this.unreadLoading = true;
      try {
        const res = await getUnreadCount();
        if (res.code === 0) {
          this.unreadCount = Number(res.data.count ?? 0);
        } else {
          Msg.showFail('获取未读消息失败');
        }
      } catch (error) {
        Msg.showFail('获取未读消息失败');
      } finally {
        this.unreadLoading = false;
      }
    },

    applyIncomingNotification(notification: INotification) {
      const exists = this.notificationList.some((item) => item.id === notification.id);
      if (exists) return;

      this.notificationList.unshift(notification);
      if (!notification.readAt) {
        this.unreadCount += 1;
      }
    },

    async markReadAction(notificationId: RouteParam) {
      const numericId = Number(notificationId);
      const notification = this.notificationList.find((item) => item.id === numericId);
      if (!notification || notification.readAt) return;

      try {
        const res = await markNotificationRead(notificationId);
        if (res.code === 0) {
          notification.readAt = new Date().toISOString();
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        } else {
          Msg.showFail('标记消息已读失败');
        }
      } catch (error) {
        Msg.showFail('标记消息已读失败');
      }
    },

    async markAllReadAction() {
      const hasUnread = this.notificationList.some((item) => !item.readAt) || this.unreadCount > 0;
      if (!hasUnread) return;

      try {
        const res = await markAllNotificationsRead();
        if (res.code === 0) {
          const readAt = new Date().toISOString();
          this.notificationList = this.notificationList.map((item) => ({
            ...item,
            readAt: item.readAt ?? readAt,
          }));
          this.unreadCount = 0;
        } else {
          Msg.showFail('全部标记已读失败');
        }
      } catch (error) {
        Msg.showFail('全部标记已读失败');
      }
    },

    resetNotification() {
      this.notificationList = [];
      this.unreadCount = 0;
      this.loading = false;
      this.unreadLoading = false;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotificationStore, import.meta.hot));
}

export default useNotificationStore;
