<template>
  <div class="avatar">
    <el-popover popper-class="user-popover" width="200px" :disabled="disabled" placement="top-start" trigger="hover" :open-delay="400">
      <div class="user">
        <el-avatar :src="avatarUrl" @click="goProfile" :size="60" />
        <div class="user-info">
          <div class="info1">
            <h2>{{ info.name }}</h2>
            <img :src="userSex" alt="" />
          </div>
          <div>{{ info.career ?? 'Coder' }}</div>
          <div class="info2">
            <span>关注:{{ followCount('following') }}</span>
            <span>粉丝:{{ followCount('follower') }}</span>
          </div>
        </div>
      </div>
      <div class="follow">
        <FollowButton :isFollowed="isFollowed" :profile="info" />
      </div>
      <template #reference>
        <el-avatar :src="avatarUrl" @mouseenter="mouseenter" @click="goProfile" :size="size" />
      </template>
    </el-popover>
    <div class="avatar-icon" v-if="showSet && isUser(info.id)"><slot name="icon"></slot></div>
  </div>
</template>

<script lang="ts" setup>
import FollowButton from '@/components/FollowButton.vue';
import { debounce } from '@/utils';

import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user';
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { followInfo, isFollowed, isUser } = storeToRefs(userStore);

const props = defineProps({
  info: {
    type: Object as PropType<IUserInfo>,
    default: () => {}
  },
  size: {
    type: Number
  },
  showSet: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});
const avatarUrl = computed(() => props.info.avatarUrl ?? new URL('@/assets/img/user/avatar.png', import.meta.url).href);
const userSex = computed(() => new URL(`../../assets/img/user/${props.info.sex === '女' ? 'female' : 'male'}-icon.webp`, import.meta.url).href);
const mouseenter = debounce(
  function () {
    !props.disabled && userStore.getFollowAction(props.info.id);
  },
  400,
  true
);

const followCount = computed(() => {
  return (type: string) => followInfo.value[type]?.length ?? 0;
});

const goProfile = () => {
  console.log('goProfile route.path', route.path);
  const path = `/user/${props.info.id}`;
  if (path === route.path) {
    router.go(0);
  } else {
    !props.disabled && router.push(path);
  }
};
</script>

<style lang="scss" scoped>
.avatar {
  position: relative;
  outline: none;
  border-radius: 50%;
  .avatar-icon {
    position: absolute;
    top: 0;
    text-align: center;
    line-height: 200px;
    font-size: 50px;
    width: 200px;
    height: 200px;
    background: rgba(0, 0, 0, 0.2);
    color: #fff;
    border-radius: 50%;
    overflow: hidden;
    transition: all 0.3s;
    opacity: 0;
    user-select: none;
    &:hover {
      opacity: 1;
    }
  }
}
:deep(.el-avatar) {
  cursor: pointer;
}
.user-popover {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);

  .user {
    display: flex;
    align-items: center;

    .user-info {
      margin-left: 10px;
      .info1 {
        display: flex;
        align-items: center;
        img {
          margin: 5px 0 0 5px;
          width: 20px;
        }
      }
      .info2 {
        display: flex;
        align-items: center;

        span:first-of-type {
          margin-right: 5px;
        }
      }
    }
  }

  .follow {
    margin-top: 15px;
    .el-button {
      width: 100%;
      border: 1px solid #70b6ff;
    }
  }
}
</style>
