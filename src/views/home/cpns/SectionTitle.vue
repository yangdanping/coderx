<template>
  <h1 class="section-title" :id="id">
    <slot></slot>
    <a :href="`#${id}`" class="header-anchor">#</a>
  </h1>
</template>

<script setup lang="ts">
defineProps<{
  id: string;
}>();
</script>

<style lang="scss" scoped>
.section-title {
  margin: 20px 0;
}
</style>
