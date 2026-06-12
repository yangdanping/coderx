export type NotificationType = 'article_like' | 'comment_like' | 'article_comment' | 'comment_reply' | 'follow';
export type NotificationTargetType = 'article' | 'comment' | 'user';

export interface INotificationMetadata {
  commentExcerpt?: string;
  parentCommentId?: number;
  replyId?: number;
  recipientRole?: 'comment_author' | 'article_author';
  [key: string]: unknown;
}

export interface INotification {
  id: number;
  recipientId: number;
  actorId: number;
  actor?: {
    id: number;
    name?: string;
    avatarUrl?: string;
  } | null;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetId: number;
  articleId: number | null;
  commentId?: number | null;
  article?: {
    id: number;
    title?: string;
  } | null;
  comment?: {
    id: number;
    content?: string;
  } | null;
  metadata?: INotificationMetadata | null;
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
