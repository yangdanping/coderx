<template>
  <div class="right">
    <el-button @click="changeDialog" class="register-btn">Hello CoderX</el-button>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import useUserStore from '@/stores/user';
const userStore = useUserStore();
const changeDialog = () => {
  console.log('changeDialog');
  userStore.changeLoginDialog();
};
</script>

<style lang="scss" scoped>
.right {
  height: 100%;
  width: 100px;
  margin-right: 50px;
  .register-btn {
    position: relative;
    color: #fff;
    /* font-size: 16px; */
    background: linear-gradient(90deg, #afffe3, #f888c8, #ffeb3b, #43c3ff);
    background-size: 400%;
    transition: all 0.3s;
    z-index: 1;
  }
  .register-btn::before {
    content: '';
    position: absolute;
    left: -5px;
    right: -5px;
    top: -5px;
    bottom: -5px;
    background: linear-gradient(90deg, #afffe3, #f888c8, #ffeb3b, #43c3ff);
    background-size: 400%;
    filter: blur(15px);
    z-index: -1;
  }
  .register-btn:hover {
    text-shadow: 0px 2px 10px rgb(255, 255, 255);
    animation: flow 3s infinite;
    transform: scale(1.2);
  }
  .register-btn:hover ::before {
    animation: flow 3s infinite;
  }
}
</style>
