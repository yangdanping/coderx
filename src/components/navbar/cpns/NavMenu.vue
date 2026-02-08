<template>
  <nav class="nav-menu">
    <div class="menu">
      <a
        class="menu-item"
        :class="{ active: activeRoute === item.path, 'special-flow': item.name === 'Flow' }"
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
import useArticleStore from '@/stores/article.store';
const articleStore = useArticleStore();
const router = useRouter();
const route = useRoute();

const menus = ref([
  { name: '首页', path: '/' },
  { name: '专栏', path: '/article' },
  { name: 'Flow', path: '/flow' },
  // { name: '写文章', path: '/edit' },
  // { name: '个人空间', path: '/user' }
]);
const activeRoute = ref('/');
watch(
  () => route.path,
  (newPath) => {
    activeRoute.value = newPath;
  },
  { immediate: true },
);
const handleSelect = (key: string) => {
  activeRoute.value = key;
  if (key === '/article' && route.query.searchValue) {
    articleStore.refreshFirstPageAction();
  }
  console.log('activeRoute.value', activeRoute.value);
  router.push({ path: key });
};
</script>

<style lang="scss" scoped>
@media (hover: hover) and (pointer: fine) {
  :deep(.el-tabs__nav) {
    cursor: url('@/assets/img/pointer.svg'), auto;
  }
}
.nav-menu {
  user-select: none;
  // letter-spacing: 0.1em;
  font-size: 22px;
  .menu {
    display: flex;
    margin-left: 30px;
    .menu-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      padding: 0 20px;
      height: var(--navbarHeight);
      &:hover {
        // color: #81c995;
        cursor: pointer;
        opacity: 0.8;
      }
      &.active {
        border-bottom: 2px solid #81c995;
        color: #81c995;
      }
      &.special-flow {
        font-family: 'MapleMono', sans-serif;
        font-weight: 600;
        background-image: var(--xfontStyle);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  }
}
</style>
