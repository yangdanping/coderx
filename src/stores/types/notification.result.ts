export type NotificationType = 'article_like';
export type NotificationTargetType = 'article';

export interface INotification {
  id: number;
  recipientId: number;
  actorId: number;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetId: number;
  articleId: number;
  readAt: string | null;
  createdAt: string;
  lastOccurredAt: string;
}

export interface INotificationState {
  notificationList: INotification[];
  unreadCount: number;
  pageSize: number;
  loading: boolean;
  unreadLoading: boolean;
}

