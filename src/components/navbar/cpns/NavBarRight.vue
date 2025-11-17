<template>
  <div class="right">
    <NavBarSearch />

    <template v-if="!token">
      <el-button @click="changeDialog" class="register-btn">Hello CoderX</el-button>
    </template>
    <template v-else>
      <NavBarUser />
      <NavBarUserHistory />
    </template>
  </div>
</template>

<script lang="ts" setup>
import NavBarUser from './NavBarUser.vue';
import NavBarUserHistory from './NavBarUserHistory.vue';
import NavBarSearch from './NavBarSearch.vue';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
const rootStore = useRootStore();
const { token } = storeToRefs(useUserStore());

const changeDialog = () => {
  console.log('open Dialog');
  rootStore.changeLoginDialog();
};
</script>

<style lang="scss" scoped>
.right {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100px;
  margin-right: 300px;
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

    &::before {
      animation: flow 3s infinite;
    }
  }
}
</style>
