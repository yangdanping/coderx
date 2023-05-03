<template>
  <div class="app">
    <RouterView class="router-view" />
    <el-backtop :right="100" :bottom="100" :style="{ color: '#81c995' }" />
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
