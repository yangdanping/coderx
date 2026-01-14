<template>
  <div class="login-panel">
    <div class="form-container">
      <div class="title">
        <div class="title-login" v-if="isLogin">
          <span>Welcome to</span> <span>Coder<span class="x">X</span></span>
        </div>
        <div class="title-text" v-else>注册</div>
      </div>
      <LoginAccount v-if="isLogin" />
      <RegisterAccount v-else />
      <div class="toggle-tip">
        <span v-if="isLogin"> 还没有账号？<a @click="toggleMode">立即注册</a> </span>
        <span v-else> 已有账号？<a @click="toggleMode">立即登录</a> </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import LoginAccount from './LoginAccount.vue';
import RegisterAccount from './RegisterAccount.vue';

const isLogin = ref(true);

const toggleMode = () => {
  isLogin.value = !isLogin.value;
};
</script>

<style lang="scss" scoped>
$height: 42px;
.login-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;

  .form-container {
    width: 100%;
    max-width: 420px;

    .title {
      font-size: 32px;
      text-align: center;
      margin-bottom: 36px;
      color: #2c3e50;
      letter-spacing: 1px;
      .title-login {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .x {
        font-style: oblique;
        padding-right: 4px;
        background-image: var(--xfontStyle);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .toggle-tip {
      margin-top: 28px;
      text-align: center;
      font-size: 14px;
      color: #606266;
      line-height: 1.5;

      a {
        color: #409eff;
        cursor: pointer;
        text-decoration: none;
        margin-left: 4px;
        font-weight: 600;
        transition: all 0.3s;

        &:hover {
          color: #66b1ff;
          text-decoration: underline;
        }
      }
    }
  }
}
</style>
