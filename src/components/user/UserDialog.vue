<template>
  <div class="">
    <el-dialog v-model="showLoginDialog" @close="hindDialog" :append-to-body="false" center>
      <LoginPanel v-if="!showProfile" />
      <!-- <CompleteProfile v-else :editForm="editForm" /> -->
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import useUserStore from '@/stores/user';
import { ElDialog } from 'element-plus';
import { emitter } from '@/utils';

import LoginPanel from './login/LoginPanel.vue';
// import CompleteProfile from './profile/CompleteProfile.vue';
const userStore = useUserStore();

const { showLoginDialog } = storeToRefs(userStore);
const showProfile = ref(false);
const hindDialog = () => userStore.changeLoginDialog();
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
