<template>
  <div class="oauth-callback">
    <div class="callback-container">
      <template v-if="loading">
        <el-icon class="loading-icon" :size="48">
          <Loading />
        </el-icon>
        <p class="loading-text">正在登录中...</p>
      </template>
      <template v-else-if="error">
        <el-icon class="error-icon" :size="48">
          <CircleCloseFilled />
        </el-icon>
        <p class="error-text">{{ errorMessage }}</p>
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue';
import { LocalCache, Msg } from '@/utils';
import { getUserInfoById } from '@/service/user/user.request';
import useUserStore from '@/stores/user.store';
import router from '@/router';

const userStore = useUserStore();

const loading = ref(true);
const error = ref(false);
const errorMessage = ref('');

const goHome = () => {
  router.push('/');
};

const handleOAuthCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);

  // 检查是否有错误
  const errorParam = urlParams.get('error');
  if (errorParam) {
    error.value = true;
    errorMessage.value = decodeURIComponent(errorParam) || '登录失败，请重试';
    loading.value = false;
    return;
  }

  // 获取 token 和用户信息
  const token = urlParams.get('token');
  const userId = urlParams.get('userId');
  const userName = urlParams.get('userName');

  if (!token || !userId) {
    error.value = true;
    errorMessage.value = '登录信息不完整，请重试';
    loading.value = false;
    return;
  }

  try {
    // 1. 存储 token
    LocalCache.setCache('token', token);
    userStore.token = token;

    // 2. 获取完整用户信息
    const res = await getUserInfoById(userId);
    if (res.code === 0) {
      const userInfo = res.data;
      userStore.userInfo = userInfo;
      LocalCache.setCache('userInfo', userInfo);

      Msg.showSuccess('登录成功');

      // 3. 跳转到首页
      router.replace('/');
    } else {
      throw new Error('获取用户信息失败');
    }
  } catch (err) {
    error.value = true;
    errorMessage.value = '登录过程中发生错误，请重试';
    // 清理可能存储的无效数据
    LocalCache.removeCache('token');
    LocalCache.removeCache('userInfo');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  handleOAuthCallback();
});
</script>

<style lang="scss" scoped>
.oauth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fa;

  .callback-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

    .loading-icon {
      color: #409eff;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      margin-top: 16px;
      color: #606266;
      font-size: 16px;
    }

    .error-icon {
      color: #f56c6c;
    }

    .error-text {
      margin: 16px 0 24px;
      color: #f56c6c;
      font-size: 16px;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
