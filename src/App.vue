<template>
  <div class="app">
    <RouterView class="router-view" />
    <el-backtop :right="100" :bottom="100" :style="{ color: '#81c995' }" />
  </div>
</template>

<script lang="ts" setup>
import { LocalCache } from '@/utils';

// ============== 🔌 在线状态功能开关 ==============
// 根据需要切换或注释掉任意一行即可：
// - Socket.IO 版本：自动重连、跨浏览器兼容
// - WebSocket 版本：原生 API、无依赖
// - 全部注释：禁用在线状态功能
import onlineStatusService from '@/service/online/socketio'; // Socket.IO 版本（推荐）
// import onlineStatusService from '@/service/online/websocket'; // WebSocket 版本
// ===============================================

/**
 * 全局在线状态管理
 * 职责：在应用启动时建立 Socket 连接，接收在线用户列表
 *
 * 连接模式：
 * - 已登录：作为"在线用户"连接，会显示在在线列表中
 * - 未登录：作为"观察者"连接，只接收列表不显示在列表中
 *
 * 断开时机：
 * - 用户退出登录（见 user.store.ts 的 logOut）
 * - 关闭标签页/浏览器（beforeunload 事件）
 * - 应用销毁（App.vue unmounted）
 */
onMounted(() => {
  // 无论是否登录，都建立连接以接收在线用户列表
  const token = LocalCache.getCache('token');

  if (token) {
    console.log('检测到用户已登录（存在 token），以"在线用户"模式连接...');
  } else {
    console.log('用户未登录（无 token），以"观察者"模式连接（可查看在线用户，但自己不显示为在线）...');
  }

  // 建立连接（前端服务会自动判断是否为游客）
  onlineStatusService.connect();

  // 监听标签页/浏览器关闭事件，断开连接
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('beforeunload', handleBeforeUnload);

  // 组件销毁时断开连接
  onlineStatusService.disconnect();
});

/**
 * 处理标签页关闭事件
 */
function handleBeforeUnload() {
  console.log('标签页即将关闭，正在断开在线连接...');
  onlineStatusService.disconnect();
}
</script>

<style lang="scss" scoped>
.app {
  background: var(--bg);
  transition: background-color 1s;
  .router-view {
    min-height: calc(100vh - var(--navbarHeight));
    &:not(.edit) {
      padding-top: var(--navbarHeight);
    }
  }
}
</style>
