<template>
  <div class="app">
    <RouterView />
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.app {
  background: var(--bg);
  transition: background-color 1s;
}
</style>
