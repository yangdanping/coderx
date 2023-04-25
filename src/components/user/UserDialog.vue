<template>
  <div class="user-dialog">
    <el-dialog v-model="showLoginDialog" @close="hindDialog" :before-close="beforeClose" :append-to-body="false" center>
      <LoginPanel v-if="!showProfile" />
      <!-- <CompleteProfile v-else :editForm="editForm" /> -->
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import useUserStore from '@/stores/user';

import LoginPanel from './login/LoginPanel.vue';
// import CompleteProfile from './profile/CompleteProfile.vue';
const userStore = useUserStore();

const { showLoginDialog } = storeToRefs(userStore);
const showProfile = ref(false);
const beforeClose = (done: () => void) => {
  console.log('beforeClose');
  done();
};
const hindDialog = () => {
  console.log('close Dialog');
  userStore.changeLoginDialog();
};
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  /* ::v-deep .el-dialog--center { */
  max-width: 900px;
  min-width: 800px;
  animation: fadeShow 1s forwards;
  border-radius: 10px !important;
}
</style>
