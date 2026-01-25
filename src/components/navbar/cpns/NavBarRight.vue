<template>
  <div class="right">
    <slot name="right"> </slot>

    <!-- 主题切换下拉菜单 -->
    <el-dropdown @command="handleThemeChange" trigger="click" class="theme-dropdown">
      <div class="theme-btn-wrapper">
        <el-icon :size="20">
          <Sun v-if="mode === 'light'" />
          <Moon v-else-if="mode === 'dark'" />
          <Monitor v-else />
        </el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="light" :class="{ active: mode === 'light' }">
            <el-icon><Sun /></el-icon>
            <span>浅色</span>
          </el-dropdown-item>
          <el-dropdown-item command="dark" :class="{ active: mode === 'dark' }">
            <el-icon><Moon /></el-icon>
            <span>深色</span>
          </el-dropdown-item>
          <el-dropdown-item command="system" :class="{ active: mode === 'system' }">
            <el-icon><Monitor /></el-icon>
            <span>跟随系统</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <template v-if="isMe">
      <NavBarUser />
      <NavBarUserHistory />
    </template>
    <el-button @click="changeDialog" class="register-btn" v-else><span>Hello Coder</span> <span class="x">X</span></el-button>
  </div>
</template>

<script lang="ts" setup>
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import NavBarUser from './NavBarUser.vue';
import NavBarUserHistory from './NavBarUserHistory.vue';
import { useAuth } from '@/composables/useAuth';
import { useTheme, type ThemeMode } from '@/composables/useTheme';
import useUserStore from '@/stores/user.store';
import useRootStore from '@/stores/index.store';

const rootStore = useRootStore();
const userStore = useUserStore();
const { isCurrentUser } = useAuth();
const { mode, setMode } = useTheme();
const isMe = computed(() => isCurrentUser(userStore.userInfo.id));

const changeDialog = () => {
  console.log('open Dialog');
  rootStore.toggleLoginDialog();
};

// 主题切换处理
const handleThemeChange = (command: ThemeMode) => {
  setMode(command);
};
</script>

<style lang="scss" scoped>
.right {
  display: flex;
  align-items: center;
  gap: 30px;
  height: 100%;
  margin-right: 20px;

  .theme-btn-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.3s;

    &:hover {
      color: var(--text-primary);
      background: var(--glass-bg);
    }
  }

  .register-btn {
    position: relative;
    height: 36px;
    transition: all 0.3s;
    .x {
      font-style: oblique;
      padding-right: 2px;
      background-image: var(--xfontStyle);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

// 主题下拉菜单项样式
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;

  &.active {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}

// 移动端响应式样式
@media (max-width: 768px) {
  .right {
    gap: 15px;
    .register-btn {
      font-size: 14px;
      padding: 8px 12px;
    }
  }
}
</style>
