<template>
  <div class="user-dialog">
    <el-dialog v-model="showDialog" @close="hindDialog" :before-close="beforeClose" :append-to-body="false" :destroy-on-close="true" center>
      <LoginPanel v-if="!showProfile" />
      <!-- <CompleteProfile v-else :editForm="editForm" /> -->
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import useRootStore from '@/stores';
import LoginPanel from './login/LoginPanel.vue';
// import CompleteProfile from './profile/CompleteProfile.vue';
const rootStore = useRootStore();

const { showDialog } = storeToRefs(rootStore);
const showProfile = ref(false);
const beforeClose = (done: () => void) => {
  console.log('beforeClose');
  done();
};
const hindDialog = () => {
  console.log('close Dialog');
  rootStore.changeLoginDialog();
};
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  max-width: 900px;
  min-width: 800px;
  animation: fadeShow 1s forwards;
  border-radius: 10px !important;
}
</style>
