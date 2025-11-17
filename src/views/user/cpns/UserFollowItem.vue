<template>
  <div class="">
    <div v-for="item in userFollowList" :key="item.id">
      <div class="content-wrapper" @click="goDetail(item.id)">
        <div class="content">
          <Avatar :info="item" disabled />
          <a class="name">{{ item.name }}</a>
        </div>
        <div class="btn">
          <FollowButton :isFollowed="isUserFollowed(item.id, followType)" :profile="item" isFollowListItem />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import FollowButton from '@/components/FollowButton.vue';

import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user.store';
import { emitter } from '@/utils';

const router = useRouter();
const userStore = useUserStore();
const { isUserFollowed, token } = storeToRefs(userStore);

const { followType = '', userFollow = [] } = defineProps<{
  followType?: string;
  userFollow?: IUserInfo[];
}>();
//定义非响应式常量(涉及以下三次手动更新 1.UserFollow中tab列表切换 2.UserProfile中tab列表切换 3.路由更新后手动清空)
let userFollowList: IUserInfo[] = userFollow;

onMounted(() => {
  emitter.on('updateFollowList', () => {
    console.log('updateFollowList 手动更新userFollowList');
    userFollowList = userFollow;
  });
});

watch(
  () => followType,
  (newV) => {
    console.log('watch切换tab 手动更新userFollowList', newV);
    userFollowList = userFollow;
  },
);

const goDetail = (userId) => {
  console.log('UserFollowItem goDetail', userId);
  router.push(`/user/${userId}`).then(() => {
    userFollowList = []; //路由跳转手动清空当前组件的关注列表
  });
};
</script>

<style lang="scss" scoped>
.content-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e6eb;
  padding: 15px;
  cursor: pointer;
  .content {
    display: flex;
    align-items: center;
    .name {
      margin: 0 30px;
      font-weight: 700;
      font-size: 24px;
    }
  }
}
</style>
