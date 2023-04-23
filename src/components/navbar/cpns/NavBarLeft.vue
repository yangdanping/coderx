<template>
  <div class="left">
    <img class="logo" src="@/assets/img/logo.svg" alt="" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
</script>

<style lang="scss" scoped>
.left {
  width: 120px;
  /* padding: 0 20px; */
  cursor: pointer;
  .logo {
    width: 100%;
  }
}
</style>
