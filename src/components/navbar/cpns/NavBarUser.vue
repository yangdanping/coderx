<template>
  <div class="nav-bar-user">
    <div class="user-avatar" @mouseenter="toggle(true)" @mouseleave="toggle(false)">
      <Avatar :info="userInfo" disabled :size="avatarSize"></Avatar>
      <div class="box" v-if="isShow">
        <div class="user-info">
          <div class="following btn" @click="goProfile('关注', 'following')">
            <div>{{ followCount('following') }}</div>
            <div>关注</div>
          </div>
          <div class="follower btn" @click="goProfile('关注', 'follower')">
            <div>{{ followCount('follower') }}</div>
            <div>粉丝</div>
          </div>
        </div>
        <div class="panel-default">
          <div class="btn1">
            <el-button type="success" class="editbtn" @click="goEdit" plain>
              <el-icon><IEditPen /></el-icon>写文章
            </el-button>
          </div>
          <div class="btn2">
            <el-button @click="goProfile()" type="primary" plain>
              <el-icon><ICoordinate /></el-icon>我的空间
            </el-button>
          </div>
          <div class="btn3">
            <el-button @click="logOut" type="danger" plain>
              <el-icon><ISwitchButton /></el-icon>退出登录
            </el-button>
          </div>
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
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { userInfo, followCount } = storeToRefs(userStore);
const rootStore = useRootStore();
const { isSmallScreen } = storeToRefs(rootStore);
const isShow = ref(false);
const toggle = debounce(function (toggle) {
  isShow.value = toggle;
  userStore.getFollowAction(userInfo.value.id);
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

    .box {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 58px;
      width: 150px;
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      animation: boxDown 0.3s forwards;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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
          border-right: 2px solid #ccc;
          padding-right: 10px;
        }
        .follower {
          padding-left: 10px;
        }
      }

      .panel-default {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin-top: 10px;
        transition: all 0.3s ease-in-out;
        transform: translateX(0);
        opacity: 1;

        [class^='btn'] {
          width: 100%;
          margin-top: 10px;
          .el-button {
            width: 100%;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .el-icon {
              font-size: 14px;
            }
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
        z-index: 99;
      }
    }
  }

  .el-icon-message {
    font-size: 30px;
    margin: 7px 10px 0 10px;
    cursor: pointer;
  }
  .editbtn {
    margin-right: 10px;
    padding: 0 25px;
  }
}
</style>
