<template>
  <div class="login-panel">
    <div class="welcome">
      <h1>登录CoderX,进入Coder世界</h1>
      <img src="@/assets/img/welcome.svg" alt="" />
    </div>
    <el-tabs stretch v-model="activeName" @tab-click="handleClick">
      <el-tab-pane label="登录" name="login">
        <LoginAccount />
      </el-tab-pane>
      <el-tab-pane label="注册" name="register">
        <RegisterAccount />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import LoginAccount from './LoginAccount.vue';
import RegisterAccount from './RegisterAccount.vue';
const activeName = ref('login');
const handleClick = (tab, event) => {
  console.log(tab, event);
};
</script>

<style lang="scss" scoped>
.login-panel {
  display: flex;
  justify-content: space-between;
  width: 100%;
  .el-tabs {
    flex: 1;
    margin-left: 70px;
    :deep(.el-tabs__item) {
      font-size: 20px;
    }
  }
}
</style>
