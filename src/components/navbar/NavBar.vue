<template>
  <header class="nav-bar">
    <div class="list">
      <NavBarLeft> </NavBarLeft>
      <div class="center">
        <slot name="center">
          <NavMenu v-if="showNavMenu" />
        </slot>
      </div>
      <NavBarRight> </NavBarRight>
    </div>
  </header>
  <UserDialog />
</template>

<script lang="ts" setup>
import NavBarLeft from './cpns/NavBarLeft.vue';
import NavBarRight from './cpns/NavBarRight.vue';
import NavMenu from './cpns/NavMenu.vue';
import UserDialog from '../user/UserDialog.vue';
import useRootStore from '@/stores';
const rootStore = useRootStore();
const { windowInfo } = storeToRefs(rootStore);
const showNavMenu = ref(true);
watch(
  () => windowInfo.value,
  (newV) => {
    showNavMenu.value = newV.width < 790 ? false : true;
  },
);
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
  z-index: 99;
  background-color: rgba(255, 255, 255, 0.8);
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
    }
  }
}
</style>
