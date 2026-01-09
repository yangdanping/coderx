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
            <span class="btn" role="button" @click="goProfile('关注', 'following')">关注:{{ followCountById(info.id, 'following') }}</span>
            <span class="btn" role="button" @click="goProfile('关注', 'follower')">粉丝:{{ followCountById(info.id, 'follower') }}</span>
          </div>
        </div>
      </div>
      <div class="follow">
        <FollowButton :isFollowed="isFollowedById(info.id)" :profile="info" />
      </div>
      <template #reference>
        <el-avatar :src="avatarUrl" @mouseenter="mouseenter" @click="goProfile()" :size="size" :class="{ 'online-border': isOnline }" />
      </template>
    </el-popover>
    <div class="avatar-icon" v-if="showSet && isMe"><slot name="icon"></slot></div>
  </div>
</template>

<script lang="ts" setup>
import FollowButton from '@/components/FollowButton.vue';
import { debounce, getImageUrl } from '@/utils';

import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user.store';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { isCurrentUser } = useAuth();
// 使用按 userId 获取的 getters，避免 hover 不同用户时状态互相覆盖
const { isFollowedById, followCountById, onlineUsers, userOnlineStatus } = storeToRefs(userStore);

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

// 判断是否为当前登录用户（用于控制头像编辑图标显示）
const isMe = computed(() => isCurrentUser(info.id));

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
  display: inline-flex; // 使用 inline-flex 确保容器尺寸紧贴内部内容(el-avatar), 从而使绝对定位的遮罩层能正确覆盖

  outline: none;
  border-radius: 50%;
  .avatar-icon {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    font-size: 30px;
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
