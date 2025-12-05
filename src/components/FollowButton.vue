<template>
  <el-button
    v-if="!isUser(profile.id)"
    :style="{ width }"
    @click.stop="follow"
    @mouseenter="ToggleUnFollow(true)"
    @mouseleave="ToggleUnFollow(false)"
    :type="!isFollowed ? 'primary' : ''"
    :icon="!isFollowed ? Plus : ''"
  >
    {{ !isFollowed ? '关注' : !isWantToUnFollowed ? '已关注' : '取消关注' }}
  </el-button>
</template>

<script lang="ts" setup>
import { Msg } from '@/utils';
import { Plus } from '@element-plus/icons-vue';

import type { IUserInfo } from '@/stores/types/user.result';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
const rootStore = useRootStore();
const userStore = useUserStore();
const { isUser, token } = storeToRefs(userStore);

const {
  profile = {},
  isFollowed = false,
  isFollowListItem = false,
  width = '100%',
} = defineProps<{
  profile: IUserInfo;
  isFollowed?: boolean;
  // false:传入用户id,true:传入登录用户id
  isFollowListItem?: boolean;
  width?: string;
}>();
const isWantToUnFollowed = ref(false);
const ToggleUnFollow = (toggle: boolean) => {
  if (isFollowed) {
    isWantToUnFollowed.value = toggle;
  }
};

const follow = () => {
  if (token.value) {
    userStore.followAction(profile.id, isFollowListItem);
  } else {
    Msg.showFail('请先登录');
    rootStore.toggleLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
