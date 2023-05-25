<template>
  <div class="app">
    <RouterView class="router-view" />
    <el-backtop :right="100" :bottom="100" :style="{ color: '#81c995' }" />
  </div>
</template>

<script lang="ts" setup>
import { useSocket } from '@/service/socket';
import { LocalCache } from './utils';
import useUserStore from './stores/user';
const userStore = useUserStore();
const state = reactive<any>({
  userName: LocalCache.getCache('userInfo')?.name ?? '',
  userList: [],
  targetUser: null,
  msgText: '',
  msgBox: {}
});

const socket = useSocket(state);
watch(
  () => state.userList,
  (newV) => {
    userStore.updateOnlineUsers(newV);
    const currentUser = newV.find((user) => user.userName === state.userName);
    console.log('当前在线用户', newV, currentUser);
    if (currentUser) {
      userStore.updateOnlineStatus(currentUser.status);
    }
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
.app {
  background: var(--bg);
  transition: background-color 1s;
  .router-view {
    min-height: 100vh;
    &:not(.edit) {
      padding-top: var(--navbarHeight);
    }
  }
}
</style>
