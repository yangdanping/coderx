<template>
  <div class="nav-bar-user">
    <el-tooltip class="item" effect="dark" content="反馈中心" placement="bottom">
      <i @click="showFeedBack = true" class="el-icon-message"></i>
    </el-tooltip>
    <el-button class="editbtn" @click="goEdit" type="primary">写文章</el-button>
    <el-dropdown>
      <Avatar :info="userInfo" disabled></Avatar>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="goProfile">我的空间</el-dropdown-item>
          <el-dropdown-item @click="logOut">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

import useUserStore from '@/stores/user';
const router = useRouter();
const userStore = useUserStore();
const { userInfo } = storeToRefs(userStore);

const showFeedBack = ref(false);

const goEdit = () => {
  console.log('goEdit');
  router.push('/edit');
};

const goProfile = () => {
  console.log('goProfile');
  router.push(`/user/${userInfo.value.id}`);
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
