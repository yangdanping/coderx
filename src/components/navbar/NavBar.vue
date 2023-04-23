<template>
  <header class="nav-bar">
    <div class="list">
      <NavBarLeft />
      <NavBarCenter />
      <NavBarRight />
      <!-- <el-button @click="handleItemClick(item)" v-for="item in menus" :key="item.path">{{ item.name }}</el-button> -->
    </div>
  </header>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import NavBarLeft from './cpns/NavBarLeft.vue';
import NavBarRight from './cpns/NavBarRight.vue';
import NavBarCenter from './cpns/NavBarCenter.vue';

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
.nav-bar {
  height: 80px;
  /* background: #fff; */
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  position: sticky;

  top: 0;
  z-index: 99;
  .list {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    max-width: 1432px;
  }
}
</style>
