<template>
  <nav class="nav-menu">
    <div class="menu">
      <a
        class="menu-item"
        :class="{ active: activeRoute === item.path }"
        v-for="item in menus"
        @click.prevent="handleSelect(item.path)"
        :href="item.path"
        :index="item.path"
        :key="item.name"
      >
        {{ item.name }}
      </a>
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
  color: var(--fontColor);
  .menu {
    display: flex;
    font-size: 22px;
    margin-left: 60px;
    .menu-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      padding: 0 10px;
      height: var(--navbarHeight);
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
