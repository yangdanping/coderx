<template>
  <div class="">
    <div v-for="item in userFollow" :key="item.id">
      <div class="content-wrapper" @click="goDetail(item.id)">
        <div class="content">
          <Avatar :info="item" disabled />
          <a class="name">{{ item.name }}</a>
        </div>
        <div class="btn">
          <FollowButton :isFollowed="isUserFollowed(item.id, followType)" :profile="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import FollowButton from '@/components/FollowButton.vue';

import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user';
const router = useRouter();
const userStore = useUserStore();
const { isUserFollowed } = storeToRefs(userStore);

const props = defineProps({
  followType: {
    type: String,
    default: ''
  },
  userFollow: {
    type: Array as PropType<IUserInfo[]>,
    default: () => []
  }
});

const goDetail = (userId) => {
  console.log('UserFollowItem goDetail', userId);
  // router.push(`/user/${userId}`)
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
