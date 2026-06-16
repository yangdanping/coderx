<template>
  <NavBarActionPanel title="浏览记录" aria-label="打开浏览记录" @open="handleOpen">
    <template #trigger>
      <Clock :size="20" />
    </template>

    <template #title-icon>
      <Clock :size="18" class="history-title-icon" />
    </template>

    <template #default>
      <div v-if="historyStore.historyList.length" class="history-list">
        <template v-for="item in historyStore.historyList.slice(0, 5)" :key="item.id">
          <NavBarUserHistoryItem :item="item" />
        </template>
      </div>

      <div v-else class="history-empty">
        <AlertTriangle :size="22" />
        <span>暂无浏览记录</span>
      </div>
    </template>

    <template v-if="historyStore.historyList.length > 5" #footer="{ close }">
      <button type="button" class="full-history-btn" @click="goToHistoryPage(close)">查看更多</button>
    </template>
  </NavBarActionPanel>
</template>

<script lang="ts" setup>
import NavBarActionPanel from './NavBarActionPanel.vue';
import NavBarUserHistoryItem from './NavBarUserHistoryItem.vue';
import useHistoryStore from '@/stores/history.store';
import useUserStore from '@/stores/user.store';
import { Clock, AlertTriangle } from '@lucide/vue';

const router = useRouter();
const userStore = useUserStore();
const historyStore = useHistoryStore();
const { userInfo } = storeToRefs(userStore);

const handleOpen = () => {
  void historyStore.getHistoryAction(true);
};

const goToHistoryPage = (close: () => void) => {
  close();
  router.push({
    path: `/user/${userInfo.value.id}`,
    query: { tabName: '最近浏览' },
  });
};
</script>

<style lang="scss" scoped>
.history-title-icon {
  color: var(--yellow);
}

.history-list {
  padding: 8px;
}

.history-empty {
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

.full-history-btn {
  width: 100%;
  padding: 11px 0;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  background: transparent;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    color: var(--el-color-success);
    background: var(--glass-bg);
  }
}
</style>

