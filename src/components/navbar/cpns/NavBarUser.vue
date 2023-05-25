<template>
  <div class="nav-bar-user">
    <div class="user-avatar" @mouseenter="toggle(true)" @mouseleave="toggle(false)">
      <Avatar :info="userInfo" disabled :size="50"></Avatar>
      <div class="box" v-if="isShow">
        <div class="user-info">
          <div class="following" @click="goProfile('关注', 'following')">
            <div>{{ followCount('following') }}</div>
            <div>关注</div>
          </div>
          <div class="follower" @click="goProfile('关注', 'follower')">
            <div>{{ followCount('follower') }}</div>
            <div>粉丝</div>
          </div>
        </div>
        <div class="btn1">
          <el-button type="success" class="editbtn" @click="goEdit" plain>
            <el-icon><IEditPen /></el-icon>写文章
          </el-button>
        </div>
        <div class="btn2">
          <el-button @click="goProfile()" type="primary" plain>我的空间</el-button>
        </div>
        <div class="btn3">
          <el-button @click="logOut" type="danger" plain>退出登录</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

import useUserStore from '@/stores/user';
import { debounce } from '@/utils';
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { userInfo, followCount } = storeToRefs(userStore);

const isShow = ref(false);

const toggle = debounce(function (toggle) {
  isShow.value = toggle;
  userStore.getFollowAction(userInfo.value.id);
}, 200);

const goEdit = () => {
  console.log('goEdit');
  router.push('/edit');
};

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
          subTabName
        }
      });
    }
  }
};
const logOut = () => {
  userStore.logOut();
};
</script>

<style lang="scss" scoped>
.nav-bar-user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .user-avatar {
    position: relative;

    .box {
      position: absolute;
      left: 50%;
      bottom: -240px;
      width: 150px;
      background-color: rgba(255, 255, 255);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      animation: titleDown 0.8s forwards;
      .user-info {
        display: flex;
        align-items: center;
        margin-top: 20px;
        font-size: 20px;
        font-weight: 100;
        > div {
          /* margin-right: 10px; */
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          > div:first-of-type {
            font-size: 25px;
            font-weight: 400;
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
      [class^='btn'] {
        width: 100%;
        margin-top: 10px;
        .el-button {
          width: 100%;
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
