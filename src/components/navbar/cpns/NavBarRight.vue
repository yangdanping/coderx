<template>
  <div class="right">
    <slot name="right"> </slot>

    <!-- 主题切换按钮：点击在 light / dark 间切换，按 D 键同样可切换 -->
    <el-tooltip effect="dark" placement="bottom" :show-after="300" :hide-after="0">
      <template #content>
        <span>切换到{{ isDark ? '浅色' : '深色' }}主题</span>
        <span class="shortcut-hint"> 按 <kbd class="shortcut-key">d</kbd> 键切换 </span>
      </template>
      <button type="button" class="theme-btn-wrapper" :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'" @click="handleThemeClick">
        <Transition name="theme-icon" mode="out-in">
          <el-icon v-if="isDark" key="moon" :size="20"><Moon /></el-icon>
          <el-icon v-else key="sun" :size="20"><Sun /></el-icon>
        </Transition>
      </button>
    </el-tooltip>

    <template v-if="isMe">
      <NavBarUser />
      <NavBarUserHistory />
    </template>
    <el-button @click="changeDialog" class="register-btn" v-else><span>Hello Coder</span> <span class="x">X</span></el-button>
  </div>
</template>

<script lang="ts" setup>
import { Sun, Moon } from 'lucide-vue-next';
import NavBarUser from './NavBarUser.vue';
import NavBarUserHistory from './NavBarUserHistory.vue';
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import useUserStore from '@/stores/user.store';
import useRootStore from '@/stores/index.store';

const rootStore = useRootStore();
const userStore = useUserStore();
const { isCurrentUser } = useAuth();
const { isDark, toggleDark } = useTheme();
const isMe = computed(() => isCurrentUser(userStore.userInfo.id));

const changeDialog = () => {
  console.log('open Dialog');
  rootStore.toggleLoginDialog();
};

// 鼠标点击切换主题后主动失焦，避免后续按 D 键时浏览器把焦点状态
// "升级"为 :focus-visible 而出现蓝色描边（键盘 Tab 聚焦时的焦点环仍保留）
const handleThemeClick = (event: MouseEvent) => {
  toggleDark();
  (event.currentTarget as HTMLElement | null)?.blur();
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
    padding: 0;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--text-secondary);
    background: transparent;
    transition: all 0.3s;

    &:hover {
      color: var(--text-primary);
      background: var(--glass-bg);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
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

// 主题图标切换动画
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.2s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
}

// Tooltip 内的快捷键提示
.shortcut-hint {
  margin-left: 8px;
  opacity: 0.75;
  font-size: 12px;
}

.shortcut-key {
  display: inline-block;
  min-width: 18px;
  padding: 0 4px;
  margin: 0 2px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  font-family: var(--el-font-family, inherit);
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
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
