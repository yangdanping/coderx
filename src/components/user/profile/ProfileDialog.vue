<template>
  <div class="profile-dialog">
    <el-dialog v-model="showProfileDialog" width="80%" @close="handleClose" :append-to-body="false" destroy-on-close center>
      <ProfilePanel :editForm="profileEditForm" />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import useRootStore from '@/stores/index.store';
import ProfilePanel from './ProfilePanel.vue';
import { emitter } from '@/utils';

const rootStore = useRootStore();
const { showProfileDialog, profileEditForm } = storeToRefs(rootStore);

onMounted(() => {
  emitter.on('updateProfile', (payload: any) => {
    rootStore.setProfileEditForm(payload);
    rootStore.toggleProfileDialog();
  });
});

const handleClose = () => {
  rootStore.toggleProfileDialog();
};
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  animation: fadeShow 0.3s forwards;

  // 在小屏幕上自适应
  @media (max-width: 768px) {
    width: 90vw !important;
  }

  // 移除默认 padding，让内容更紧凑
  .el-dialog__body {
    padding: 20px 30px 30px;
  }
}
</style>
