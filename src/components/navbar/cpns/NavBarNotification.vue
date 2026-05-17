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
          <span class="notification-item__icon">
            <Heart :size="16" />
          </span>
          <span class="notification-item__content">
            <span class="notification-item__title">用户 #{{ item.actorId }} 点赞了你的文章</span>
            <span class="notification-item__meta">
              文章 #{{ item.articleId }}
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
import { Bell, BellOff, Heart } from 'lucide-vue-next';
import NavBarActionPanel from './NavBarActionPanel.vue';
import useNotificationStore from '@/stores/notification.store';
import dateFormat from '@/utils/dateFormat';
import type { INotification } from '@/stores/types/notification.result';

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

const handleItemClick = async (item: INotification, close: () => void) => {
  await notificationStore.markReadAction(item.id);
  close();

  const routeUrl = router.resolve({
    name: 'detail',
    params: { articleId: item.articleId },
  });
  window.open(routeUrl.href, '_blank');
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

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    color: var(--el-color-danger);
    background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
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

