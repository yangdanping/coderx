<template>
  <header class="nav-bar" :style="{ '--navbar-glass-progress': glassProgress }">
    <div class="list">
      <!-- 左边区域================================================= -->
      <NavBarLeft />
      <!-- 中间区域================================================= -->
      <div class="center">
        <slot name="center">
          <div v-if="isUserPage" class="back-icon-container">
            <el-tooltip class="item" effect="dark" content="返回" placement="bottom">
              <button type="button" class="back-icon" aria-label="返回" @click="goBack">
                <el-icon><ArrowLeft aria-hidden="true" /></el-icon>
              </button>
            </el-tooltip>
          </div>
        </slot>
      </div>
      <!-- 右边区域================================================= -->
      <NavBarRight>
        <template #right>
          <NavMenu v-if="toggleNavMenu" />
          <NavBarSearch />
        </template>
      </NavBarRight>
    </div>
  </header>
  <LoginDialog />
  <ProfileDialog />
</template>

<script lang="ts" setup>
import NavBarLeft from './cpns/NavBarLeft.vue';
import NavBarRight from './cpns/NavBarRight.vue';
import NavMenu from './cpns/NavMenu.vue';
import NavBarSearch from './cpns/NavBarSearch.vue';
import LoginDialog from '../user/login/LoginDialog.vue';
import ProfileDialog from '../user/profile/ProfileDialog.vue';
import { useNavbarGlass } from '@/composables/useNavbarGlass';
import useRootStore from '@/stores/index.store';
import { ArrowLeft } from '@lucide/vue';

interface NavBarProps {
  glassRevealStart?: number;
  glassRevealEnd?: number;
}

const props = withDefaults(defineProps<NavBarProps>(), {
  glassRevealStart: 0,
  glassRevealEnd: 96,
});

const { progress: glassProgress } = useNavbarGlass({
  start: () => props.glassRevealStart,
  end: () => props.glassRevealEnd,
});

const route = useRoute();
const router = useRouter();

const rootStore = useRootStore();
const { windowInfo } = storeToRefs(rootStore);

const isUserPage = computed(() => route.name === 'user');

// 当 width 为 0（未初始化）时，默认显示菜单（按大屏处理）
const toggleNavMenu = computed(() => {
  const width = windowInfo.value.width;
  return width === 0 || width > 768;
});

const goBack = () => {
  if (window.history.state && window.history.state.back) {
    router.go(-1);
  } else {
    router.push('/');
  }
};
</script>

<style lang="scss" scoped>
.nav-bar {
  /* position: sticky; */
  position: fixed;
  right: 0;
  left: 0;
  top: 0;
  /* display: flex; */
  height: var(--navbarHeight);
  z-index: var(--z-navbar);
  isolation: isolate;
  background-color: transparent;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    opacity: var(--navbar-glass-progress);
    box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.2);
  }

  .list {
    --navbar-logo-rail: clamp(88px, 10vw, 176px);

    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: var(--navbar-logo-rail) minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 16px;
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    margin: 0;
    padding-inline: clamp(18px, 7vw, 150px) clamp(18px, 6vw, 120px);
    height: 100%;

    :deep(.left) {
      justify-self: start;
    }

    :deep(.right) {
      justify-self: end;
      min-width: 0;
    }

    @media (max-width: 768px) {
      --navbar-logo-rail: 72px;

      grid-template-columns: minmax(64px, auto) minmax(0, 1fr) auto;
      gap: 4px;
      padding-inline: max(10px, env(safe-area-inset-left)) max(10px, env(safe-area-inset-right));
    }
    .center {
      min-width: 0;
      display: flex;
      justify-content: center;
      align-items: center;

      @media (max-width: 768px) {
        position: static;
        left: auto;
        transform: none;
        flex: 1;
        min-width: 0;
        justify-content: center;
        padding-inline: 6px;
      }

      .back-icon-container {
        display: flex;
        align-items: center;
        @media (min-width: 768px) {
          margin-left: 30px;
        }
      }
      .back-icon {
        cursor: pointer;
        border: 0;
        padding: 0;
        font-size: 32px;
        display: flex;
        align-items: center;
        color: #666;
        background: transparent;
        transition:
          color 0.3s ease,
          transform 0.3s ease;
        &:hover {
          transform: translate(-6px, 0);
          color: #81c995;
        }

        &:focus-visible {
          outline: 2px solid var(--el-color-primary);
          outline-offset: 2px;
        }
      }
    }
  }
}
</style>
