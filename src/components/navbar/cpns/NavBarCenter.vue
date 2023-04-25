<template>
  <div class="center">
    <slot name="center"></slot>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
</script>

<style lang="scss" scoped>
.center {
  flex: 1;
  display: flex;
  /* justify-content: space-around; */
  /* background: pink; */
}
</style>
