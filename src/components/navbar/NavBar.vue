<template>
  <header class="nav-bar">
    <div class="list">
      <!-- 左边区域================================================= -->
      <NavBarLeft />
      <!-- 中间区域================================================= -->
      <div class="center" :style="{ justifyContent: toggleNavMenu ? 'flex-start' : 'center' }">
        <slot name="center">
          <div v-if="isUserPage" class="back-icon-container">
            <el-tooltip class="item" effect="dark" content="返回" placement="bottom">
              <i class="back-icon" @click="goBack">
                <el-icon><ArrowLeft /></el-icon>
              </i>
            </el-tooltip>
          </div>
          <template v-else>
            <NavMenu v-if="toggleNavMenu" />
            <NavBarSearch v-else />
          </template>
        </slot>
      </div>
      <!-- 右边区域================================================= -->
      <NavBarRight>
        <template #right>
          <NavBarSearch v-if="toggleNavMenu" />
        </template>
      </NavBarRight>
    </div>
  </header>
  <UserDialog />
</template>

<script lang="ts" setup>
import NavBarLeft from './cpns/NavBarLeft.vue';
import NavBarRight from './cpns/NavBarRight.vue';
import NavMenu from './cpns/NavMenu.vue';
import NavBarSearch from './cpns/NavBarSearch.vue';
import UserDialog from '../user/UserDialog.vue';
import useRootStore from '@/stores/index.store';
import { ArrowLeft } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const rootStore = useRootStore();
const { windowInfo } = storeToRefs(rootStore);

const isUserPage = computed(() => route.name === 'user');

// 当 width 为 0（未初始化）时，默认显示菜单（按大屏处理）
const toggleNavMenu = computed(() => {
  const width = windowInfo.value.width;
  return width === 0 || width >= 768;
});

const goBack = () => {
  router.go(-1);
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
  background-color: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.2);
  .list {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    /* padding: 0 80px; */
    max-width: 1280px;
    height: 100%;
    .center {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      .back-icon-container {
        display: flex;
        align-items: center;
        @media (min-width: 768px) {
          margin-left: 30px;
        }
      }
      .back-icon {
        cursor: pointer;
        transition: all 0.3s;
        font-size: 32px;
        display: flex;
        align-items: center;
        color: #666;
        &:hover {
          transform: translate(-6px, 0);
          color: #81c995;
        }
      }
    }
  }
}
</style>
