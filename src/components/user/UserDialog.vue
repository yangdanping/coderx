<template>
  <div class="user-dialog">
    <el-dialog v-model="showLoginDialog" @close="hindDialog" :append-to-body="false" destroy-on-close center>
      <LoginPanel v-if="!showProfile" />
      <ProfilePanel v-else :editForm="editForm" />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import useRootStore from '@/stores/index.store';
import LoginPanel from './login/LoginPanel.vue';
import ProfilePanel from './profile/ProfilePanel.vue';
import { emitter } from '@/utils';
const rootStore = useRootStore();

const { showLoginDialog } = storeToRefs(rootStore);
const showProfile = ref(false);
const editForm = ref({});
onMounted(() => {
  emitter.on('updateProfile', (payload: any) => {
    showProfile.value = true;
    editForm.value = payload;
  });
});

const hindDialog = () => {
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
