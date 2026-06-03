<template>
  <div class="profile-dialog">
    <el-dialog v-model="showProfileDialog" width="480px" @close="handleClose" :append-to-body="false" destroy-on-close center>
      <ProfilePanel :editForm="profileEditForm" />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import useRootStore from '@/stores/index.store';
import ProfilePanel from './ProfilePanel.vue';
import { emitter } from '@/utils';
import type { IUserInfo } from '@/stores/types/user.result';

const rootStore = useRootStore();
const { showProfileDialog, profileEditForm } = storeToRefs(rootStore);

const handleClose = () => {
  rootStore.closeProfileDialog();
};

const handleUpdateProfile = (payload: unknown) => {
  rootStore.setProfileEditForm(payload as Partial<IUserInfo>);
  rootStore.openProfileDialog();
};

onMounted(() => {
  emitter.on('updateProfile', handleUpdateProfile);
});

onUnmounted(() => {
  emitter.off('updateProfile', handleUpdateProfile);
});
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  overscroll-behavior: contain;
  animation: fadeShow 0.3s forwards;

  // 在小屏幕上自适应
  @media (max-width: 768px) {
    width: 90vw !important;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  // 移除默认 padding，让内容更紧凑
  .el-dialog__body {
    padding: 24px 30px 30px;
  }
}
</style>
