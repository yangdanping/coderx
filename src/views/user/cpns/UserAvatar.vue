<template>
  <div class="user-avatar">
    <el-upload action="avatar" :http-request="avatarUpLoad as UploadRequestHandler" :before-upload="beforeAvatarUpload" :disabled="!isMe" :show-file-list="false">
      <Avatar :info="currentInfo" :size="size" showSet disabled>
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

// computed数据源：登录用户使用 store（响应式），其他用户使用 prop
const currentInfo = computed(() => {
  const result = isMe.value ? userStore.userInfo : info;
  console.log('[UserAvatar] currentInfo 更新:', {
    isMe: isMe.value,
    infoId: info.id,
    propAvatarUrl: info.avatarUrl,
    storeAvatarUrl: userStore.userInfo.avatarUrl,
    finalAvatarUrl: result.avatarUrl,
  });
  return result;
});

const beforeAvatarUpload = (file) => {
  const isLt2M = file.size / 1024 / 1024 < 2;
  !isLt2M && Msg.showInfo('上传头像图片大小不能超过 2MB!');
  return isLt2M;
};
const avatarUpLoad = (content) => {
  console.log('[UserAvatar] 开始上传头像');
  userStore.uploadAvatarAction(content);
};
</script>

<style lang="scss" scoped>
:deep(.el-upload) {
  border-radius: 50%;
  overflow: hidden;
}
</style>
