<template>
  <div class="right">
    <slot name="right"> </slot>
    <template v-if="isMe">
      <NavBarUser />
      <NavBarUserHistory />
    </template>
    <el-button @click="changeDialog" class="register-btn" v-else><span>Hello Coder</span> <span class="x">X</span></el-button>
  </div>
</template>

<script lang="ts" setup>
import NavBarUser from './NavBarUser.vue';
import NavBarUserHistory from './NavBarUserHistory.vue';
import { useAuth } from '@/composables/useAuth';
import useUserStore from '@/stores/user.store';
import useRootStore from '@/stores/index.store';
const rootStore = useRootStore();
const userStore = useUserStore();
const { isCurrentUser } = useAuth();
const isMe = computed(() => isCurrentUser(userStore.userInfo.id));

const changeDialog = () => {
  console.log('open Dialog');
  rootStore.toggleLoginDialog();
};
</script>

<style lang="scss" scoped>
.right {
  display: flex;
  align-items: center;
  gap: 40px;
  height: 100%;
  margin-right: 20px;
  .register-btn {
    position: relative;
    height: 36px;
    // color: #fff;
    // background: linear-gradient(90deg, #afffe3, #f888c8, #ffeb3b, #43c3ff);
    // background-size: 400%;
    transition: all 0.3s;
    .x {
      font-style: oblique;
      padding-right: 2px;
      background-image: linear-gradient(135deg, #8feb87 10%, #3848f9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
  // .register-btn::before {
  //   content: '';
  //   position: absolute;
  //   left: -5px;
  //   right: -5px;
  //   top: -5px;
  //   bottom: -5px;
  //   background: linear-gradient(90deg, #afffe3, #f888c8, #ffeb3b, #43c3ff);
  //   background-size: 400%;
  //   filter: blur(15px);
  //   z-index: -1;
  // }
  // .register-btn:hover {
  //   text-shadow: 0px 2px 10px rgb(255, 255, 255);
  //   animation: flow 3s infinite;
  //   transform: scale(1.2);

  //   &::before {
  //     animation: flow 3s infinite;
  //   }
  // }
}

// 移动端响应式样式
@media (max-width: 768px) {
  .right {
    // margin-right: 30px;
    .register-btn {
      font-size: 14px;
      padding: 8px 12px;
    }
  }
}
</style>
