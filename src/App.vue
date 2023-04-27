<template>
  <div class="app">
    <RouterView class="router-view" />
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.app {
  background: var(--bg);
  transition: background-color 1s;
  .router-view {
    min-height: 100vh;
    &:not(.edit) {
      padding-top: var(--navbarHeight);
    }
  }
}
</style>
