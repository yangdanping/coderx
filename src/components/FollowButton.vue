<template>
  <el-button
    v-if="!isMe"
    :style="{ width }"
    @click.stop="follow"
    @mouseenter="ToggleUnFollow(true)"
    @mouseleave="ToggleUnFollow(false)"
    :type="!isFollowed ? 'primary' : ''"
    plain
    :icon="!isFollowed ? Plus : ''"
  >
    {{ !isFollowed ? '关注' : !isWantToUnFollowed ? '已关注' : '取消关注' }}
  </el-button>
</template>

<script lang="ts" setup>
import { Msg } from '@/utils';
import { Plus } from '@element-plus/icons-vue';
import { useAuth } from '@/composables/useAuth';
import debounce from '@/utils/debounce';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';

import type { IUserInfo } from '@/stores/types/user.result';

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

const rootStore = useRootStore();
const userStore = useUserStore();
const { isCurrentUser } = useAuth();
const { token } = storeToRefs(userStore);

const isWantToUnFollowed = ref(false);

// 判断是否为当前登录用户（用于控制关注按钮显示）
const isMe = computed(() => isCurrentUser(profile.id));

const ToggleUnFollow = (toggle: boolean) => {
  if (isFollowed) {
    isWantToUnFollowed.value = toggle;
  }
};

const follow = debounce(() => {
  if (token.value) {
    userStore.followAction(profile.id, isFollowListItem);
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
});
</script>

<style lang="scss" scoped></style>
