<template>
  <div class="user-avatar">
    <el-upload action="avatar" :http-request="avatarUpLoad as UploadRequestHandler" :before-upload="beforeAvatarUpload" :disabled="!isUser(info.id)" :show-file-list="false">
      <Avatar :info="info" :size="200" showSet disabled>
        <template #icon>
          <el-icon><IEdit /></el-icon>
        </template>
      </Avatar>
    </el-upload>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import { Msg } from '@/utils';

import type { UploadRequestHandler } from 'element-plus';
import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user.store';
const userStore = useUserStore();
const { isUser } = storeToRefs(userStore);

const { info = {} } = defineProps<{
  info?: IUserInfo;
}>();

const beforeAvatarUpload = (file) => {
  const isLt2M = file.size / 1024 / 1024 < 2;
  !isLt2M && Msg.showInfo('上传头像图片大小不能超过 2MB!');
  return isLt2M;
};
const avatarUpLoad = (content) => {
  userStore.uploadAvatarAction(content);
};
</script>

<style lang="scss" scoped>
:deep(.el-upload) {
  border-radius: 50%;
  overflow: hidden;
}
</style>
