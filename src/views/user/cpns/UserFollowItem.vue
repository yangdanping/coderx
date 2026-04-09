<template>
  <div class="">
    <div v-for="item in userFollowList" :key="item.id">
      <div class="content-wrapper" @click="goDetail(item.id)">
        <div class="content">
          <Avatar :info="item" disabled />
          <a class="name">{{ item.name }}</a>
        </div>
        <div class="btn">
          <FollowButton :isFollowed="isUserFollowed(item.id, props.followType)" :profile="item" isFollowListItem />
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

const router = useRouter();
const userStore = useUserStore();
const { isUserFollowed } = storeToRefs(userStore);

const props = withDefaults(
  defineProps<{
    followType?: string;
    userFollow?: IUserInfo[];
  }>(),
  {
    followType: '',
    userFollow: () => [],
  },
);
const userFollowList = computed(() => props.userFollow);

const goDetail = (userId: number) => {
  console.log('UserFollowItem goDetail', userId);
  router.push(`/user/${userId}`);
};
</script>

<style lang="scss" scoped>
.content-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  @include thin-border(bottom, #eee);
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
