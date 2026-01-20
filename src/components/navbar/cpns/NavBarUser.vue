<template>
  <div class="nav-bar-user">
    <div class="user-avatar" @mouseenter="toggle(true)" @mouseleave="toggle(false)">
      <Avatar :info="userInfo" disabled :size="avatarSize"></Avatar>
      <div class="nav-bar-user-panel" v-if="isShow">
        <div class="user-info">
          <div class="following btn" @click="goProfile('关注', 'following')">
            <div>{{ myFollowCount('following') }}</div>
            <div>关注</div>
          </div>
          <div class="follower btn" @click="goProfile('关注', 'follower')">
            <div>{{ myFollowCount('follower') }}</div>
            <div>粉丝</div>
          </div>
        </div>
        <div class="panel-default">
          <el-button @click="goEdit" type="success" plain>
            <div class="btn-content">
              <el-icon> <PenSquare /> </el-icon><span>写文章</span>
            </div>
          </el-button>
          <el-button @click="goProfile()" type="primary" plain>
            <div class="btn-content">
              <el-icon> <MapPin /> </el-icon><span>我的空间</span>
            </div>
          </el-button>
          <el-button @click="logOut" type="danger" plain>
            <div class="btn-content">
              <el-icon> <LogOut /> </el-icon><span>退出登录</span>
            </div>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

import useUserStore from '@/stores/user.store';
import useRootStore from '@/stores/index.store';
import { debounce } from '@/utils';
import { PenSquare, MapPin, LogOut } from 'lucide-vue-next';
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { userInfo, myFollowCount } = storeToRefs(userStore);
const rootStore = useRootStore();
const { isSmallScreen } = storeToRefs(rootStore);
const isShow = ref(false);
const toggle = debounce(function (toggle) {
  isShow.value = toggle;
  userStore.getMyFollowAction(userInfo.value.id);
}, 200);

const goEdit = () => router.push('/edit');

const avatarSize = computed(() => {
  return isSmallScreen.value ? 30 : 40;
});

const goProfile = (tabName?: string, subTabName?: 'following' | 'follower') => {
  console.log('goProfile', route.path, tabName, subTabName);
  let path = `/user/${userInfo.value.id}`;
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

const logOut = () => {
  userStore.logOut(true); // 用户主动退出登录,刷新页面
};
</script>

<style lang="scss" scoped>
.nav-bar-user {
  display: flex;
  align-items: center;
  justify-content: center;

  .user-avatar {
    position: relative;
    z-index: var(--z-navbar-popup);

    .nav-bar-user-panel {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 58px;
      width: 150px;
      background-color: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      animation: boxDown 0.3s forwards;
      overflow: hidden;
      transition: all 0.3s ease-in-out;

      .user-info {
        display: flex;
        align-items: center;
        margin-top: 20px;
        font-size: 20px;
        font-weight: 100;

        > div {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s;

          > div:first-of-type {
            font-size: 25px;
            font-weight: 400;
          }

          &:hover {
            color: #409eff;
          }
        }

        .following {
          @include thin-border(right, #eee);
          padding-right: 10px;
        }

        .follower {
          padding-left: 10px;
        }
      }

      .panel-default {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        width: 100%;
        margin-top: 10px;
        transition: all 0.3s ease-in-out;
        transform: translateX(0);
        opacity: 1;

        .el-button {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          transition: all 0.3s;
          margin-top: 10px;
          margin-left: 0;

          .btn-content {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            width: 85px;
          }

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }

    /* 头像hover */
    :deep(.avatar) {
      transition: transform 0.3s;
    }

    &:hover {
      :deep(.avatar) {
        transform: scale(1.8) translate(0, 15px);
        z-index: calc(var(--z-navbar-popup) + 1);
      }
    }
  }
}
</style>
