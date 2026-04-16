<template>
  <div class="app">
    <!-- 除了编辑页面，其他页面都显示导航栏 -->
    <NavBar v-if="showNavBar" />
    <RouterView class="router-view" />
    <el-backtop v-bind="backTopPosition" :style="{ color: '#81c995' }" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import { LocalCache } from '@/utils';
import useRootStore from '@/stores/index.store';
// ============== 🔌 在线状态功能开关 ==============
// 根据需要切换或注释掉任意一行即可：
// - Socket.IO 版本：自动重连、跨浏览器兼容
// - WebSocket 版本：原生 API、无依赖
// - 全部注释：禁用在线状态功能
import onlineStatusService from '@/service/online/socketio'; // Socket.IO 版本（推荐）
// import onlineStatusService from '@/service/online/websocket'; // WebSocket 版本
// ===============================================

const rootStore = useRootStore();
const { windowInfo, isSmallScreen } = storeToRefs(rootStore);

// 根据路由判断是否显示导航栏
// - 编辑页面：完全不需要导航栏
// - 详情页面：使用自定义导航栏（插槽），不显示默认导航栏
const route = useRoute();
const showNavBar = computed(() => {
  /*
   * ======== 初始导航保护 ========
   * 1. 刷新时 router 的首次导航是异步的，App 可能先拿到一个 matched 为空的启动态路由。
   * 2. 这时如果直接按 meta 计算，会短暂误渲染出“全局 NavBar”，在详情页慢网刷新时就会看到错误顶部菜单。
   */
  if (!route.matched.length) return false;
  return route.name !== 'edit' && !route.meta.customNavBar;
});

const backTopPosition = computed(() => {
  return {
    right: isSmallScreen.value ? Number(windowInfo.value.width / 2) : Number(130),
    bottom: 20,
  };
});

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
  position: relative;
  min-height: 100vh;
  // 不设置 background-color，让 ::before 的 SVG 背景可见
  // 兜底背景色在 html 上设置

  // SVG 背景层 - 使用伪元素，便于在 dark 模式下应用滤镜
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg);
    filter: var(--bg-filter);
    z-index: var(--z-below);
    pointer-events: none;
    transition: filter 0.3s;
  }

  .router-view {
    position: relative;
    min-height: calc(100vh - var(--navbarHeight));
    &:not(.edit) {
      padding-top: var(--navbarHeight);
    }
  }
}
</style>
