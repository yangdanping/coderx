<template>
  <div class="nav-bar">
    <div class="list">
      <el-button @click="handleItemClick(item)" v-for="item in menus" :key="item.path">{{ item.name }}</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const menus = ref([
  { name: '首页', path: '/' },
  { name: '专栏', path: '/article' },
  { name: '写文章', path: '/edit' },
  { name: '个人空间', path: '/user' }
]);

const handleItemClick = (item: any) => {
  router.push({ path: item.path ?? '/not-found' });
};
</script>

<style lang="scss" scoped>
.list {
  display: flex;
  flex-direction: row;
}
</style>
