<template>
  <header class="nav-bar">
    <div class="list">
      <NavBarLeft> </NavBarLeft>
      <div class="center">
        <slot name="center">
          <NavMenu />
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
</script>

<style lang="scss" scoped>
.nav-bar {
  /* position: sticky; */
  position: fixed;
  right: 0;
  left: 0;
  top: 0;
  height: var(--navbarHeight);
  z-index: 999;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.2);
  .list {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    max-width: 1432px;
    .center {
      flex: 1;
      display: flex;
    }
  }
}
</style>
