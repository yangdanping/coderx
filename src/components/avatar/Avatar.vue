<template>
  <div class="avatar">
    <el-popover popper-class="user-popover" :width="`calc(200px + ${nameCount}em)`" :disabled="disabled" placement="top-start" trigger="hover" :open-delay="400">
      <div class="user">
        <el-avatar :src="avatarUrl" @click="goProfile()" :size="60" :class="{ 'online-border': isOnline }" />
        <el-tag size="small" effect="plain" :type="userOnlineStatus(info.name).type">{{ userOnlineStatus(info.name).msg }}</el-tag>
        <div class="user-info">
          <div class="info1">
            <h2>{{ info.name }}</h2>
            <img :src="userSex" alt="" />
          </div>
          <div>{{ info.career ?? 'Coder' }}</div>
          <div class="info2">
            <span class="btn" @click="goProfile('关注', 'following')">关注:{{ followCount('following') }}</span>
            <span class="btn" @click="goProfile('关注', 'follower')">粉丝:{{ followCount('follower') }}</span>
          </div>
        </div>
      </div>
      <div class="follow">
        <FollowButton :isFollowed="isFollowed" :profile="info" />
      </div>
      <template #reference>
        <el-avatar :src="avatarUrl" @mouseenter="mouseenter" @click="goProfile()" :size="size" :class="{ 'online-border': isOnline }" />
      </template>
    </el-popover>
    <div class="avatar-icon" v-if="showSet && isUser(info.id)"><slot name="icon"></slot></div>
  </div>
</template>

<script lang="ts" setup>
import FollowButton from '@/components/FollowButton.vue';
import { debounce, getImageUrl } from '@/utils';

import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user.store';
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { followCount, isFollowed, isUser, onlineUsers, userOnlineStatus } = storeToRefs(userStore);

const {
  info = {},
  size,
  showSet = false,
  disabled = false,
} = defineProps<{
  info?: IUserInfo & any;
  size?: number;
  showSet?: boolean;
  disabled?: boolean;
}>();
const nameCount = computed(() => {
  let count = info.name?.length! - 4; //名字超出4个则,弹框宽度增加1em
  return count > 0 ? count + 1 : 0;
});

const avatarUrl = computed(() => info.avatarUrl ?? getImageUrl('user', 'avatar'));
const userSex = computed(() => getImageUrl('user', `${info.sex === '女' ? 'female' : 'male'}-icon`));

const isOnline = computed(() => {
  const user = onlineUsers.value.find((user) => user.userName === info.name);
  return user?.status === 'online';
});
const mouseenter =
  !disabled &&
  debounce(
    function () {
      console.log('mouseenter', info?.id);
      userStore.getFollowAction(info?.id);
    },
    100,
    true,
  );

const goProfile = (tabName?: string, subTabName?: 'following' | 'follower') => {
  if (disabled) return;
  console.log('goProfile', route.path, tabName, subTabName);
  let path = `/user/${info.id}`;
  if (path === route.path) {
    router.go(0);
  } else {
    if (!tabName && !subTabName) {
      router.push(path); //不存在tabName,则用户界面默认展示文章列表
    } else {
      router.push({
        path,
        query: {
          tabName,
          subTabName,
        },
      });
    }
  }
};

// const goProfile = () => {
//   console.log('goProfile route.path', route.path);
//   const path = `/user/${props.info.id}`;
//   if (path === route.path) {
//     router.go(0);
//   } else {
//     !props.disabled && router.push(path);
//   }
// };
</script>

<style lang="scss" scoped>
.avatar {
  position: relative;
  outline: none;
  border-radius: 50%;
  /* z-index: 99; */
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
  transition: box-shadow 0.3s ease;
}
:deep(.el-avatar.online-border) {
  box-shadow:
    0 0 0 2px #41b983,
    0 0 8px 2px rgba(65, 185, 131, 0.6),
    0 0 16px 4px rgba(65, 185, 131, 0.3),
    0 0 24px 6px rgba(65, 185, 131, 0.1);
}
.user-popover {
  .user {
    position: relative;
    display: flex;
    align-items: center;

    .el-tag {
      position: absolute;
      bottom: -12px;
      left: 11px;
      user-select: none;
    }
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
        span {
          cursor: pointer;
        }
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
