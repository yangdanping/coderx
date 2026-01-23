<template>
  <div class="user-avatar">
    <!-- 改为手动触发，不自动上传 -->
    <el-upload
      action="#"
      :auto-upload="false"
      :show-file-list="false"
      :disabled="!isMe"
      :on-change="onFileChange"
      accept="image/*"
    >
      <Avatar :info="currentInfo" :size="size" showSet disabled>
        <template #icon>
          <el-icon><Edit /></el-icon>
        </template>
      </Avatar>
    </el-upload>

    <!-- 裁切弹窗 -->
    <AvatarCropper v-model:visible="showCropper" :image-src="imageSrc" @confirm="onCropConfirm" />
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import AvatarCropper from '@/components/avatar/AvatarCropper.vue';
import { Msg } from '@/utils';
import { Edit } from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';

import type { UploadFile } from 'element-plus';
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

// 裁切弹窗状态
const showCropper = ref(false);
const imageSrc = ref('');

// 文件选择后打开裁切弹窗
const onFileChange = (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return;

  // 验证文件大小
  const isLt2M = uploadFile.raw.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    Msg.showInfo('上传头像图片大小不能超过 2MB!');
    return;
  }

  // 生成预览 URL 并打开裁切弹窗
  imageSrc.value = URL.createObjectURL(uploadFile.raw);
  showCropper.value = true;
};

// 裁切确认后上传
const onCropConfirm = async (canvas: HTMLCanvasElement) => {
  console.log('[UserAvatar] 开始上传裁切后的头像');

  try {
    // 将 canvas 转换为 Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.9,
      );
    });

    // 创建 File 对象
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

    // 调用上传 action
    userStore.uploadAvatarAction({ file });
  } catch (error) {
    console.error('[UserAvatar] 头像上传失败:', error);
    Msg.showFail('头像上传失败');
  } finally {
    // 清理 ObjectURL
    if (imageSrc.value) {
      URL.revokeObjectURL(imageSrc.value);
      imageSrc.value = '';
    }
  }
};
</script>

<style lang="scss" scoped>
:deep(.el-upload) {
  border-radius: 50%;
  overflow: hidden;
}
</style>
