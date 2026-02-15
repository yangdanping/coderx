<template>
  <div class="login-panel">
    <div class="form-container">
      <div class="title">
        <div class="title-login" v-if="isLogin">
          <span>Welcome to</span> <span>Coder<span class="x">X</span></span>
        </div>
        <div class="title-text" v-else>注册</div>
      </div>
      <LoginAccount v-if="isLogin" />
      <RegisterAccount v-else />

      <!-- OAuth 登录 -->
      <template v-if="isLogin && (googleEnabled || githubEnabled)">
        <div class="oauth-divider">
          <span>或</span>
        </div>
        <div class="oauth-buttons">
          <!-- Google 登录按钮 -->
          <button v-if="googleEnabled" class="oauth-btn google-btn" :loading="googleLoading" @click="loginWithGoogle">
            <svg class="oauth-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 登录
          </button>

          <!-- GitHub 登录按钮 -->
          <button v-if="githubEnabled" class="oauth-btn github-btn" :loading="githubLoading" @click="loginWithGitHub">
            <svg class="oauth-icon" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
            使用 GitHub 登录
          </button>
        </div>
      </template>

      <div class="toggle-tip">
        <span v-if="isLogin"> 还没有账号？<a @click="toggleMode">立即注册</a> </span>
        <span v-else> 已有账号？<a @click="toggleMode">立即登录</a> </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import LoginAccount from './LoginAccount.vue';
import RegisterAccount from './RegisterAccount.vue';
import { getOAuthStatus, getGoogleAuthUrl, getGitHubAuthUrl } from '@/service/oauth/oauth.request';
import { Msg } from '@/utils';

const isLogin = ref(true);
const googleEnabled = ref(false);
const googleLoading = ref(false);
const githubEnabled = ref(false);
const githubLoading = ref(false);

const toggleMode = () => {
  isLogin.value = !isLogin.value;
};

// 检查 OAuth 是否可用
const checkOAuthStatus = async () => {
  try {
    const res = await getOAuthStatus();
    if (res.code === 0) {
      googleEnabled.value = res.data.google;
      console.log('googleEnabled', googleEnabled.value);
      githubEnabled.value = res.data.github;
      console.log('githubEnabled', githubEnabled.value);
    }
  } catch (error) {
    console.warn('OAuth 状态检查失败', error);
  }
};

// Google 登录
const loginWithGoogle = async () => {
  googleLoading.value = true;
  try {
    const res = await getGoogleAuthUrl();
    if (res.code === 0 && res.data.authUrl) {
      // 跳转到 Google 授权页面
      window.location.href = res.data.authUrl;
    } else {
      Msg.showFail('获取 Google 授权链接失败');
    }
  } catch (error) {
    Msg.showFail('Google 登录服务暂不可用');
  } finally {
    googleLoading.value = false;
  }
};

// GitHub 登录
const loginWithGitHub = async () => {
  githubLoading.value = true;
  try {
    const res = await getGitHubAuthUrl();
    if (res.code === 0 && res.data.authUrl) {
      // 跳转到 GitHub 授权页面
      window.location.href = res.data.authUrl;
    } else {
      Msg.showFail('获取 GitHub 授权链接失败');
    }
  } catch (error) {
    Msg.showFail('GitHub 登录服务暂不可用');
  } finally {
    githubLoading.value = false;
  }
};

// 组件挂载时检查 OAuth 状态
onMounted(() => {
  checkOAuthStatus();
});
</script>

<style lang="scss" scoped>
$height: 42px;
.login-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;

  .form-container {
    width: 100%;
    max-width: 420px;

    .title {
      font-size: 32px;
      text-align: center;
      margin-bottom: 36px;
      color: var(--text-primary);
      letter-spacing: 1px;
      .title-login {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .x {
        font-style: oblique;
        padding-right: 4px;
        background-image: var(--xfontStyle);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    // OAuth 分隔线
    .oauth-divider {
      display: flex;
      align-items: center;
      margin: 24px 0;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--text-secondary);
        opacity: 0.3;
      }

      span {
        padding: 0 16px;
        color: var(--text-secondary);
        font-size: 14px;
      }
    }

    // OAuth 登录按钮容器
    .oauth-buttons {
      display: flex;
      align-items: center;
      flex-direction: column;
      gap: 12px;
    }

    // OAuth 登录按钮通用样式
    .oauth-btn {
      width: 100%;
      height: $height;
      background: var(--bg-color-primary);
      border: 1px solid var(--text-secondary);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 15px;
      font-weight: 500;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;

      .oauth-icon {
        flex-shrink: 0;
      }

      &:hover {
        background: var(--bg-color-secondary);
        border-color: var(--text-secondary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      &:active {
        background: var(--bg-color-secondary);
      }
    }

    .toggle-tip {
      margin-top: 28px;
      text-align: center;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;

      a {
        color: #409eff;
        cursor: pointer;
        text-decoration: none;
        margin-left: 4px;
        font-weight: 600;
        transition: all 0.3s;

        &:hover {
          color: #66b1ff;
          text-decoration: underline;
        }
      }
    }
  }
}
</style>
