<template>
  <div class="user-card" @click="goToUserProfile">
    <div class="card-content">
      <!-- 头像组件，显示在线/离线状态 -->
      <Avatar :info="userInfo" :size="60" :disabled="false" />
      <div class="user-info">
        <h3 class="name">{{ user.userName }}</h3>
        <!-- 在线状态标签 -->
        <el-tag size="small" :type="user.status === 'online' ? 'success' : 'info'">
          {{ user.status === 'online' ? '在线' : '离线' }}
        </el-tag>
      </div>
    </div>
    <!-- 背景图和遮罩层，hover 时显示 -->
    <img class="bg" :src="userInfo.avatarUrl" alt="" />
    <div class="bg-mask"></div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

const router = useRouter();

// 接收用户信息
const { user } = defineProps<{
  user: {
    userId: string;
    userName: string;
    status: string;
    avatarUrl?: string;
    name?: string; // Avatar 组件需要的字段
  };
}>();

// 为 Avatar 组件准备数据格式
// Avatar 组件需要 name 和 id 字段，而我们的 user 对象有 userName 和 userId 字段
const userInfo = computed(() => ({
  ...user,
  name: user.userName, // 将 userName 映射为 name
  id: user.userId, // 将 userId 映射为 id（Avatar 组件的 goProfile 需要 id）
}));

// 点击卡片跳转到用户主页
const goToUserProfile = () => {
  router.push(`/user/${user.userId}`);
};
</script>

<style lang="scss" scoped>
.user-card {
  position: relative;
  box-sizing: border-box;
  /* 卡片占据 1/4 宽度，减去间距 */
  flex-basis: calc(25% - 12px);
  flex-shrink: 0;
  height: 200px;
  margin: 0 16px 16px 0;
  padding: 20px;
  @include glass-effect;
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s;
  overflow: hidden;
  cursor: pointer; /* 添加鼠标指针样式 */

  /* 每行第 4 个卡片不设置右边距 */
  &:nth-child(4n) {
    margin-right: 0;
  }

  .card-content {
    position: relative;
    z-index: var(--z-above);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .user-info {
      text-align: center;
      .name {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 500;
      }
    }
  }

  /* 背景图和遮罩层 */
  .bg,
  .bg-mask {
    opacity: 0;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: var(--z-base);
    transition: all 0.3s;
    border-radius: 6px;
  }

  .bg {
    object-fit: cover;
  }

  .bg-mask {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: var(--glass-blur);
  }

  /* hover 效果 */
  &:hover {
    box-shadow: 0px 2px 8px rgba(100, 100, 100, 0.7);
    transform: scale(1.02);

    .card-content {
      color: #fff;
      .name {
        color: #fff;
      }
    }

    .bg,
    .bg-mask {
      opacity: 1;
    }
  }
}
</style>
