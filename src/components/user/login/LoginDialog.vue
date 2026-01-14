<template>
  <div class="login-dialog">
    <el-dialog v-model="showLoginDialog" width="400px" @close="handleClose" :append-to-body="false" destroy-on-close center>
      <LoginPanel />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import useRootStore from '@/stores/index.store';
import LoginPanel from './LoginPanel.vue';

const rootStore = useRootStore();
const { showLoginDialog } = storeToRefs(rootStore);

const handleClose = () => {
  rootStore.toggleLoginDialog();
};
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  max-width: 550px;
  min-width: 400px;
  animation: fadeShow 0.3s forwards;
  // 在小屏幕上自适应
  @media (max-width: 768px) {
    width: 90vw !important;
    max-width: none;
  }

  // 移除默认 padding，让内容更紧凑
  .el-dialog__body {
    padding: 20px 30px 30px;
  }
}
</style>
