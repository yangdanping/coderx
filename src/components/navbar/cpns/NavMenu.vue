<template>
  <nav class="nav-menu">
    <div class="menu">
      <a
        class="menu-item"
        :class="{ active: isMenuActive(item), 'special-flow': item.name === 'Flow' }"
        v-for="item in menus"
        @click="handleSelect($event, item.path)"
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
import { flowNavPath } from '@/utils/flowNav';

const menus = [
  { name: 'Home', path: '/' },
  { name: 'Articles', path: '/article' },
  { name: 'Flow', path: flowNavPath() },
  // { name: '写文章', path: '/edit' },
  // { name: '个人空间', path: '/user' }
];

const router = useRouter();
const route = useRoute();

function isMenuActive(item: (typeof menus)[number]) {
  const p = route.path;
  if (item.name === 'Flow') return p === '/flow' || p === '/dev';
  return p === item.path;
}

const handleSelect = (event: MouseEvent, key: string) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  router.push({ path: key });
};
</script>

<style lang="scss" scoped>
.nav-menu {
  user-select: none;
  flex-shrink: 0;
  .menu {
    display: flex;
    align-items: center;
    gap: 4px;
    .menu-item {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 72px;
      height: var(--navbarHeight);
      padding: 0 12px;
      color: var(--text-secondary);
      font-family: var(--markdown-editor-font);
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.18em;
      line-height: 1;
      text-transform: uppercase;
      transition:
        color 0.2s ease,
        opacity 0.2s ease;
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
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0;
        text-transform: none;
        background-image: var(--xfontStyle);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  }
}

@media (max-width: 1100px) {
  .nav-menu {
    .menu {
      gap: 0;

      .menu-item {
        min-width: 60px;
        padding-inline: 8px;
        font-size: 12px;

        &.special-flow {
          font-size: 20px;
        }
      }
    }
  }
}
</style>
