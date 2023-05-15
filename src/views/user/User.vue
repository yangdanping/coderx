<template>
  <div class="user">
    <NavBar />
    <UserProfile :profile="profile" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import UserProfile from './cpns/UserProfile.vue';
import { Msg, emitter } from '@/utils';

import useUserStore from '@/stores/user';
const route = useRoute();
const userStore = useUserStore();
const { userInfo, profile } = storeToRefs(userStore);

onMounted(() => getData(route.params.userId));

watch(
  () => route.params.userId,
  (newUserId) => {
    console.log('watch newUserId', newUserId);
    getData(newUserId);
  }
);

const getData = (userId) => {
  //首次加载,得到用户信息和关注信息
  userStore.getProfileAction(userId);
  userStore.getFollowAction(userId);
  if (userInfo.value.id === parseInt(userId as any)) {
    Msg.showSuccess('获取的是登录用户的信息');
  }
};
</script>

<style lang="scss" scoped>
.user {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--fontColor);
}
</style>
