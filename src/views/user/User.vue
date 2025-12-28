<template>
  <div class="user">
    <NavBar />
    <UserProfile :profile="profile" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import UserProfile from './cpns/UserProfile.vue';

import useUserStore from '@/stores/user.store';
const route = useRoute();
const userStore = useUserStore();
const { profile } = storeToRefs(userStore);

onMounted(() => {
  console.log('route.params-----', route.params);
  getData(route.params.userId);
});

watch(
  () => route.params.userId,
  (newV) => {
    console.log('watch newUserId', newV);
    getData(newV);
  },
);

const getData = (userId) => {
  //首次加载,得到用户信息和关注信息
  userStore.getProfileAction(userId);
  userStore.getFollowAction(userId);
  // if (userInfo.value.id === parseInt(userId as any)) {
  //   Msg.showSuccess('获取的是登录用户的信息');
  // }
};
</script>

<style lang="scss" scoped>
.user {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
