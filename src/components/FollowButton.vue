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

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
const rootStore = useRootStore();
const userStore = useUserStore();
const { isUser, token } = storeToRefs(userStore);

const props = defineProps({
  profile: {
    type: Object as PropType<IUserInfo>,
    default: () => {}
  },
  isFollowed: {
    type: Boolean,
    default: false
  },
  // false:传入用户id,true:传入登录用户id
  isFollowListItem: {
    type: Boolean,
    default: false
  },
  width: {
    type: String,
    default: '100%'
  }
});
const isWantToUnFollowed = ref(false);
const ToggleUnFollow = (toggle: boolean) => {
  if (props.isFollowed) {
    isWantToUnFollowed.value = toggle;
  }
};

const follow = () => {
  if (token.value) {
    userStore.followAction(props.profile.id, props.isFollowListItem);
  } else {
    Msg.showFail('请先登录');
    rootStore.changeLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
