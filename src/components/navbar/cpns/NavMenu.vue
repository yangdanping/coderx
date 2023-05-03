<template>
  <nav class="nav-menu">
    <div class="menu">
      <div class="menu-item" :class="{ active: activeRoute === item.path }" v-for="item in menus" @click="handleSelect(item.path)" :index="item.path" :key="item.name">
        {{ item.name }}
      </div>
    </div>
  </nav>
</template>

<script lang="ts" setup>
const router = useRouter();
const route = useRoute();

const menus = ref([
  { name: '首页', path: '/' },
  { name: '专栏', path: '/article' }
  // { name: '写文章', path: '/edit' },
  // { name: '个人空间', path: '/user' }
]);
const activeRoute = ref('/');
onMounted(() => {
  activeRoute.value = route.path;
});
const handleSelect = (key: string) => {
  activeRoute.value = key;
  console.log('activeRoute.value', activeRoute.value);
  router.push({ path: key });
};
</script>

<style lang="scss" scoped>
.nav-menu {
  user-select: none;
  .menu {
    display: flex;
    color: var(--fontColor);
    font-size: 22px;
    .menu-item {
      padding: 27px;
      &:first-child {
        margin-left: 100px;
      }
      &:hover {
        color: #81c995;
        cursor: pointer;
      }
      &.active {
        border-bottom: 2px solid #81c995;
        color: #81c995;
      }
    }
  }
}
</style>
