import myRequest from '@/service';
import type { IPage, IResData, RouteParam } from '@/service/types';
import type { INotification } from '@/stores/types/notification.result';

const urlHead = '/notification';

export const getNotificationList = (params: IPage) => {
  return myRequest.get<IResData<INotification[]>>({
    url: urlHead,
    params,
  });
};

export const getUnreadCount = () => {
  return myRequest.get<IResData<{ count: number }>>({
    url: `${urlHead}/unread-count`,
  });
};

export const markNotificationRead = (notificationId: RouteParam) => {
  return myRequest.patch<IResData>({
    url: `${urlHead}/${notificationId}/read`,
  });
};

export const markAllNotificationsRead = () => {
  return myRequest.patch<IResData>({
    url: `${urlHead}/read-all`,
  });
};

