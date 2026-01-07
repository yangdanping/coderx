<template>
  <div class="history-icon" @mouseenter="toggle(true)" @mouseleave="toggle(false)">
    <el-icon class="clock-icon"><Clock /></el-icon>
    <div class="history-box" v-show="isShow">
      <div class="panel-history">
        <div class="history-header">
          <div class="history-title">
            <el-icon><Clock /></el-icon>
            <span>浏览记录</span>
          </div>
        </div>
        <div class="history-content">
          <div class="history-list">
            <template v-for="item in historyStore.historyList.slice(0, 5)" :key="item.id">
              <NavBarUserHistoryItem :item="item" />
            </template>
          </div>
          <div v-if="!historyStore.historyList.length" class="empty">
            <el-icon><AlertTriangle /></el-icon>
            <span>暂无浏览记录</span>
          </div>
        </div>
        <div class="full-history-btn" role="button" v-if="historyStore.historyList.length > 5" @click="goToHistoryPage">查看更多</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBarUserHistoryItem from './NavBarUserHistoryItem.vue';

import useHistoryStore from '@/stores/history.store';
import useUserStore from '@/stores/user.store';
import { debounce } from '@/utils';
import { Clock, AlertTriangle } from 'lucide-vue-next';

const router = useRouter();
const userStore = useUserStore();
const historyStore = useHistoryStore();
const { userInfo } = storeToRefs(userStore);

const isShow = ref(false);

const toggle = debounce(async function (show: boolean) {
  isShow.value = show;

  // 当显示面板时，获取浏览记录
  if (show) {
    await historyStore.getHistoryAction(true);
  }
}, 200);

// 跳转到个人空间的浏览记录
const goToHistoryPage = () => {
  const routeData = router.resolve({
    path: `/user/${userInfo.value.id}`,
    query: { tabName: '最近浏览' },
  });
  window.open(routeData.href, '_blank');
};
</script>

<style lang="scss" scoped>
.history-icon {
  position: relative;
  border-radius: 50%;
  transition: all 0.3s;

  .clock-icon {
    font-size: 24px;
    color: #666;
    transition: color 0.3s;
    &:hover {
      color: #409eff;
    }
  }

  .history-box {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 40px;
    margin-top: 10px;
    width: 380px;
    height: 400px;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: var(--z-navbar-popup);
    animation: boxDown 0.3s forwards;
    .panel-history {
      width: 100%;
      height: calc(100% - 40px);
      display: flex;
      flex-direction: column;

      .history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;

        .history-title {
          display: flex;
          align-items: center;
          padding: 15px;

          gap: 8px;
          font-weight: 600;
          color: #333;
          flex: 1;

          .el-icon {
            color: #f39c12;
            transition: color 0.3s;
          }
        }
      }

      .history-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;

        .empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 100%;
          font-size: 14px;
          color: #999;
        }

        .history-list {
          padding: 0 10px;
          /* padding-bottom: 10px; // 为查看更多按钮预留空间 */
        }

        .more-btn {
          text-align: center;
          padding: 10px 0;
          border-top: 1px solid #f0f0f0;
        }
      }
      .full-history-btn {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        text-align: center;
        background-color: #fff;
        padding: 10px 0;
        border-top: 1px solid #f0f0f0;
        cursor: pointer;
        font-size: 14px;
        &:hover {
          color: #42b983;
        }
      }
    }
  }
}

// 动画关键帧
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
