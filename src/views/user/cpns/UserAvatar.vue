<template>
  <div class="user-avatar">
    <el-upload action="avatar" :http-request="avatarUpLoad as UploadRequestHandler" :before-upload="beforeAvatarUpload" :disabled="!isMe" :show-file-list="false">
      <Avatar :info="info" :size="size" showSet disabled>
        <template #icon>
          <el-icon><Edit /></el-icon>
        </template>
      </Avatar>
    </el-upload>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import { Msg } from '@/utils';
import { Edit } from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';

import type { UploadRequestHandler } from 'element-plus';
import type { IUserInfo } from '@/stores/types/user.result';

import useUserStore from '@/stores/user.store';
const userStore = useUserStore();
const { isCurrentUser } = useAuth();

const { info = {}, size = 200 } = defineProps<{
  info?: IUserInfo;
  size?: number;
}>();

// 判断是否为当前登录用户（用于控制头像上传权限）
const isMe = computed(() => isCurrentUser(info.id));

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
