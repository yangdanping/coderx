<template>
  <div class="flow">
    <!-- 顶部导航栏 -->
    <NavBar />

    <div class="flow-container">
      <div class="flow-header">
        <h1>Flow</h1>
        <p class="subtitle">实时查看在线用户，基于 Socket.IO 实现</p>
        <div class="online-count">
          <el-tag type="success" size="large"> 当前在线: {{ onlineUsers.length }} 人 </el-tag>
        </div>
      </div>

      <!-- 在线用户列表 -->
      <div class="user-list" v-if="onlineUsers.length > 0">
        <OnlineUserCard v-for="user in onlineUsers" :key="user.userId" :user="user" />
      </div>

      <!-- 暂无在线用户 -->
      <div class="empty-state" v-else>
        <el-empty description="暂无在线用户">
          <template #image>
            <div class="empty-icon">👥</div>
          </template>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import OnlineUserCard from '@/components/OnlineUserCard.vue';
import useUserStore from '@/stores/user.store';

const userStore = useUserStore();
const { onlineUsers } = storeToRefs(userStore);

/**
 * Flow页面 - 在线用户展示
 *
 * 职责：
 * - 展示在线用户列表（数据来自 userStore.onlineUsers）
 * - 不再负责管理连接（连接管理已移至 App.vue）
 *
 * 说明：
 * - 在线状态由 App.vue 全局管理
 * - 此页面只负责展示数据
 * - Socket 连接在登录后自动建立，不依赖用户是否访问"Flow"页面
 */
</script>

<style lang="scss" scoped>
.flow {
  .flow-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;

    .flow-header {
      text-align: center;
      margin-bottom: 40px;

      h1 {
        font-size: 36px;
        font-weight: bold;
        margin: 0 0 16px 0;
      }

      .subtitle {
        font-size: 16px;
        color: #666;
        margin: 0 0 20px 0;
      }

      .online-count {
        display: inline-block;
      }
    }

    .user-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0; // 通过卡片自身的 margin 控制间距
    }

    .empty-state {
      padding: 60px 0;

      .empty-icon {
        font-size: 80px;
        margin-bottom: 20px;
      }
    }
  }
}
</style>
