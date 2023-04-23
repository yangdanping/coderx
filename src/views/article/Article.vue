<template>
  <div class="article">
    <NavBar />
    <h2>Article</h2>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
</script>

<style lang="scss" scoped>
.article {
  background: var(--bg);
  transition: background-color 1s;
}
</style>
