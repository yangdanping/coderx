import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { INotification } from '@/stores/types/notification.result';

const { getNotificationList, getUnreadCount, markNotificationRead, markAllNotificationsRead, showFail } = vi.hoisted(() => ({
  getNotificationList: vi.fn(),
  getUnreadCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  showFail: vi.fn(),
}));

vi.mock('@/service/notification/notification.request', () => ({
  getNotificationList,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
}));

vi.mock('@/utils', () => ({
  Msg: {
    showFail,
  },
}));

import useNotificationStore from '../notification.store';

const buildNotification = (overrides: Partial<INotification> = {}): INotification => ({
  id: 1,
  recipientId: 10,
  actorId: 20,
  type: 'article_like',
  targetType: 'article',
  targetId: 30,
  articleId: 30,
  readAt: null,
  createdAt: '2026-05-14T08:00:00.000Z',
  lastOccurredAt: '2026-05-14T08:00:00.000Z',
  ...overrides,
});

describe('notification.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getNotificationList.mockReset();
    getUnreadCount.mockReset();
    markNotificationRead.mockReset();
    markAllNotificationsRead.mockReset();
    showFail.mockReset();
  });

  it('loads notifications and unread count from REST fallback', async () => {
    const notifications = [buildNotification({ id: 2 }), buildNotification({ id: 1, readAt: '2026-05-14T08:10:00.000Z' })];
    getNotificationList.mockResolvedValue({ code: 0, data: notifications });
    getUnreadCount.mockResolvedValue({ code: 0, data: { count: 1 } });

    const store = useNotificationStore();

    await store.refreshAction(true);

    expect(getNotificationList).toHaveBeenCalledWith({ offset: 0, limit: 20 });
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
    expect(store.notificationList).toEqual(notifications);
    expect(store.unreadCount).toBe(1);
    expect(store.loading).toBe(false);
  });

  it('prepends socket notifications once and increments unread count', () => {
    const store = useNotificationStore();
    store.notificationList = [buildNotification({ id: 1, readAt: '2026-05-14T08:10:00.000Z' })];
    store.unreadCount = 0;

    const articleCommentNotification = buildNotification({
      id: 2,
      type: 'article_comment',
      commentId: 40,
      metadata: { commentExcerpt: 'hello' },
    });
    store.applyIncomingNotification(articleCommentNotification);
    store.applyIncomingNotification(articleCommentNotification);

    expect(store.notificationList.map((item) => item.id)).toEqual([2, 1]);
    expect(store.notificationList[0]).toMatchObject({
      type: 'article_comment',
      commentId: 40,
      metadata: { commentExcerpt: 'hello' },
    });
    expect(store.unreadCount).toBe(1);
  });

  it('prepends comment-reply socket notifications and keeps reply metadata', () => {
    const store = useNotificationStore();
    store.notificationList = [buildNotification({ id: 1, readAt: '2026-05-14T08:10:00.000Z' })];
    store.unreadCount = 0;

    const commentReplyNotification = buildNotification({
      id: 3,
      type: 'comment_reply',
      commentId: 40,
      metadata: { commentExcerpt: 'reply excerpt' },
    });
    store.applyIncomingNotification(commentReplyNotification);

    expect(store.notificationList.map((item) => item.id)).toEqual([3, 1]);
    expect(store.notificationList[0]).toMatchObject({
      type: 'comment_reply',
      commentId: 40,
      metadata: { commentExcerpt: 'reply excerpt' },
    });
    expect(store.unreadCount).toBe(1);
  });

  it('marks one notification as read optimistically after API success', async () => {
    markNotificationRead.mockResolvedValue({ code: 0, data: {} });
    const store = useNotificationStore();
    store.notificationList = [buildNotification({ id: 1 }), buildNotification({ id: 2 })];
    store.unreadCount = 2;

    await store.markReadAction(1);

    expect(markNotificationRead).toHaveBeenCalledWith(1);
    expect(store.notificationList[0].readAt).toEqual(expect.any(String));
    expect(store.notificationList[1].readAt).toBeNull();
    expect(store.unreadCount).toBe(1);
  });

  it('marks every notification as read after API success', async () => {
    markAllNotificationsRead.mockResolvedValue({ code: 0, data: {} });
    const store = useNotificationStore();
    store.notificationList = [buildNotification({ id: 1 }), buildNotification({ id: 2 })];
    store.unreadCount = 2;

    await store.markAllReadAction();

    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(store.notificationList.every((item) => item.readAt)).toBe(true);
    expect(store.unreadCount).toBe(0);
  });
});
