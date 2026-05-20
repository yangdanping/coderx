<template>
  <NavBarActionPanel title="消息通知" aria-label="打开消息通知" @open="handleOpen">
    <template #trigger>
      <Bell class="notification-trigger-icon" :size="20" />
      <span v-if="badgeText" class="notification-badge">{{ badgeText }}</span>
    </template>

    <template #title-icon>
      <Bell :size="18" class="notification-title-icon" />
    </template>

    <template #header-action>
      <button v-if="notificationStore.unreadCount > 0" type="button" class="mark-all-btn" @click="notificationStore.markAllReadAction()">
        全部已读
      </button>
    </template>

    <template #default="{ close }">
      <div v-if="notificationStore.notificationList.length" class="notification-list">
        <button
          v-for="item in notificationStore.notificationList"
          :key="item.id"
          type="button"
          class="notification-item"
          :class="{ 'is-unread': !item.readAt }"
          @click="handleItemClick(item, close)"
        >
          <span class="notification-item__avatar">
            <Avatar :info="getActorInfo(item)" :size="38" disabled />
            <span
              class="notification-item__action-badge"
              :class="{ 'notification-item__like-badge': getNotificationIconType(item) === 'like' }"
              aria-hidden="true"
            >
              <Icon :type="getNotificationIconType(item)" :is-active="true" :size="18" :show-label="false" :responsive="false" />
            </span>
          </span>
          <span class="notification-item__content">
            <span class="notification-item__title">{{ getActorName(item) }} {{ getNotificationTitle(item) }}</span>
            <span class="notification-item__meta">
              {{ getNotificationMeta(item) }}
              <span aria-hidden="true">·</span>
              {{ formatTime(item.createdAt) }}
            </span>
          </span>
          <span v-if="!item.readAt" class="notification-item__dot" aria-label="未读"></span>
        </button>
      </div>

      <div v-else class="notification-empty">
        <BellOff :size="22" />
        <span>暂无消息通知</span>
      </div>
    </template>
  </NavBarActionPanel>
</template>

<script lang="ts" setup>
import { Bell, BellOff } from 'lucide-vue-next';
import Avatar from '@/components/avatar/Avatar.vue';
import Icon from '@/components/icon/Icon.vue';
import NavBarActionPanel from './NavBarActionPanel.vue';
import useNotificationStore from '@/stores/notification.store';
import dateFormat from '@/utils/dateFormat';
import type { INotification } from '@/stores/types/notification.result';
import type { IUserInfo } from '@/stores/types/user.result';
import type { IconType } from '@/components/icon/types/icon.type';

const router = useRouter();
const notificationStore = useNotificationStore();

const badgeText = computed(() => {
  if (notificationStore.unreadCount <= 0) return '';
  return notificationStore.unreadCount > 99 ? '99+' : String(notificationStore.unreadCount);
});

const handleOpen = () => {
  void notificationStore.refreshAction(true);
};

const formatTime = (time: string) => dateFormat(time);
const truncateTitle = (title = '', limit = 20) => {
  const chars = Array.from(title.trim());
  return chars.length > limit ? `${chars.slice(0, limit).join('')}...` : chars.join('');
};

const getActorInfo = (item: INotification): IUserInfo => ({
  id: item.actor?.id ?? item.actorId,
  name: item.actor?.name || `用户 #${item.actorId}`,
  avatarUrl: item.actor?.avatarUrl,
});

const getActorName = (item: INotification) => getActorInfo(item).name || `用户 #${item.actorId}`;

const getArticleTitle = (item: INotification) => {
  const title = truncateTitle(item.article?.title || '');
  return title || `文章 #${item.articleId}`;
};

const getNotificationTitle = (item: INotification) => {
  if (item.type === 'article_comment') return '评论了你的文章';
  if (item.type === 'comment_reply') {
    return item.metadata?.recipientRole === 'article_author' ? '在你的文章下发表了回复' : '回复了你的评论';
  }
  return '点赞了你的文章';
};

const isCommentNotification = (item: INotification) => item.type === 'article_comment' || item.type === 'comment_reply';

const getNotificationIconType = (item: INotification): IconType => {
  if (isCommentNotification(item)) return 'comment';
  return 'like';
};

const getCommentExcerpt = (item: INotification) => {
  const excerpt = item.metadata?.commentExcerpt;
  return typeof excerpt === 'string' ? excerpt.trim() : '';
};

const getNotificationMeta = (item: INotification) => {
  if (isCommentNotification(item)) {
    return getCommentExcerpt(item) || getArticleTitle(item);
  }
  return getArticleTitle(item);
};

const getNotificationQuery = (item: INotification) => {
  if (isCommentNotification(item) && item.commentId != null) {
    const query: Record<string, string> = { commentId: String(item.commentId) };
    const replyId = item.metadata?.replyId;
    if (item.type === 'comment_reply' && (typeof replyId === 'number' || typeof replyId === 'string') && String(replyId).trim()) {
      query.replyId = String(replyId);
    }
    return query;
  }
  return undefined;
};

const handleItemClick = (item: INotification, close: () => void) => {
  const query = getNotificationQuery(item);
  const routeLocation = {
    name: 'detail',
    params: { articleId: item.articleId },
    ...(query ? { query } : {}),
  };
  void router.push(routeLocation);

  void notificationStore.markReadAction(item.id);
  close();
};
</script>

<style lang="scss" scoped>
.notification-trigger-icon {
  flex-shrink: 0;
}

.notification-badge {
  position: absolute;
  top: -3px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 17px;
  color: #fff;
  text-align: center;
  background: var(--el-color-danger);
  box-shadow: 0 0 0 2px var(--glass-bg-popup);
}

.notification-title-icon {
  color: var(--el-color-primary);
}

.mark-all-btn {
  border: none;
  padding: 4px 0;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-color-primary);
  background: transparent;

  &:hover {
    color: var(--el-color-primary-light-3);
  }
}

.notification-list {
  padding: 8px;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 62px;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
  text-align: left;
  background: transparent;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: var(--glass-bg);
  }

  &:active {
    transform: scale(0.99);
  }

  &.is-unread {
    background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);

    &:hover {
      background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
    }
  }

  &__avatar {
    position: relative;
    display: inline-flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__action-badge {
    position: absolute;
    right: -1px;
    bottom: -2px;
    display: flex;
    width: auto;
    height: auto;
    align-items: center;
    justify-content: center;
    color: var(--el-color-primary);
    filter:
      drop-shadow(0 0 1px var(--el-bg-color))
      drop-shadow(0 1px 4px color-mix(in srgb, var(--el-color-primary) 26%, transparent));
    pointer-events: none;

    :deep(.icon) {
      gap: 0;
      line-height: 1;
    }
  }

  &__like-badge {
    color: var(--el-color-primary);
  }

  &__content {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 650;
    color: var(--text-primary);
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--text-secondary);
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--el-color-danger);
  }
}

.notification-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 260px;
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .notification-item {
    min-height: 66px;
    padding: 12px 10px;
  }
}
</style>
