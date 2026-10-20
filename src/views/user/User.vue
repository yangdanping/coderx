<template>
  <div class="user">
    <div v-if="profileStatus === 'loading'" class="profile-state" role="status">正在加载用户资料…</div>
    <div v-else-if="profileStatus === 'error'" class="profile-state" role="alert">
      <p>{{ profileError }}</p>
      <button type="button" @click="getData(route.params.userId)">重试</button>
    </div>
    <UserProfile v-else-if="profileStatus === 'ready'" :key="profile.id" :profile="profile" />
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import UserProfile from './cpns/UserProfile.vue';
import useUserStore from '@/stores/user.store';
import type { RouteParam } from '@/service/types';
const route = useRoute();
const userStore = useUserStore();
const { profile, profileStatus, profileError } = storeToRefs(userStore);

const getData = (userId: RouteParam) => {
  void userStore.getProfileAction(userId);
  if (typeof userId === 'string') void userStore.getFollowAction(userId);
};

watch(() => route.params.userId, getData, { immediate: true, flush: 'sync' });

onBeforeUnmount(() => userStore.initProfile());
</script>

<style lang="scss" scoped>
.user {
  display: flex;
  flex-direction: column;
  align-items: center;

  .profile-state {
    margin: 100px auto;
    padding: 24px;
    text-align: center;
    color: var(--text-primary);

    button {
      padding: 6px 16px;
      border: 1px solid currentColor;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
  }
}
</style>
