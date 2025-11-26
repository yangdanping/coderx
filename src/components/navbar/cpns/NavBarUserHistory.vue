<template>
  <div class="history-icon" @mouseenter="toggle(true)" @mouseleave="toggle(false)">
    <el-icon class="clock-icon"><IClock /></el-icon>
    <div class="history-box" v-show="isShow">
      <div class="panel-history">
        <div class="history-header">
          <div class="history-title">
            <el-icon><IClock /></el-icon>
            <span>浏览记录</span>
          </div>
        </div>
        <div class="history-content">
          <div class="history-list">
            <template v-for="item in historyStore.historyList.slice(0, 5)" :key="item.id">
              <div class="history-item" @click="goToArticle(item)">
                <div class="item-cover">
                  <img v-if="item.cover && item.cover.length > 0" :src="item.cover[0]" :alt="item.title" />
                  <div v-else class="cover-placeholder">
                    {{ item.title.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="item-content">
                  <div class="item-title">{{ item.title }}</div>
                  <div class="item-meta">
                    <div class="item-time" v-dateformat="item.updateAt"></div>
                    <div class="item-author">
                      <Avatar :info="item.author" :src="item.author?.avatarUrl" :size="18" />
                      <span>{{ item.author?.name || '未知作者' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div v-if="!historyStore.historyList.length" class="empty">
            <el-icon><IWarning /></el-icon>
            <span>暂无浏览记录</span>
          </div>
        </div>
        <div class="full-history-btn" @click="goToHistoryPage">查看更多</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

import useHistoryStore from '@/stores/history.store';
import useUserStore from '@/stores/user.store';
import { debounce } from '@/utils';

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

// 跳转到文章详情 - 使用路由跳转避免 localhost 域名问题
const goToArticle = (item: any) => {
  const routeUrl = router.resolve({ name: 'detail', params: { articleId: item.articleId } });
  window.open(routeUrl.href, '_blank');
};

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
  margin-left: 30px;
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
    top: 55px;
    margin-top: 10px;
    width: 380px;
    height: 400px;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 999;
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
          height: 100%;
          font-size: 14px;
          color: #999;
        }

        .history-list {
          padding: 0 10px;
          /* padding-bottom: 10px; // 为查看更多按钮预留空间 */
          .history-item {
            display: flex;
            gap: 12px;
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 8px;

            &:hover {
              background-color: #f5f7fa;
            }

            &:last-child {
              margin-bottom: 0;
            }

            .item-cover {
              width: 48px;
              height: 48px;
              border-radius: 6px;
              overflow: hidden;
              flex-shrink: 0;

              img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.2s;
              }

              .cover-placeholder {
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #9de0ff 0%, #42b983 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                font-weight: bold;
              }
            }

            .item-content {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: space-between;

              .item-title {
                font-size: 13px;
                font-weight: 600;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .item-meta {
                display: flex;
                flex-direction: column;
                gap: 3px;

                .item-time {
                  font-size: 11px;
                  color: #7f8c8d;
                  font-weight: 500;
                }

                .item-author {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  font-size: 11px;
                  color: #95a5a6;

                  /* &::before {
                    content: '👤';
                    font-size: 10px;
                  } */
                }
              }
            }
          }
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
