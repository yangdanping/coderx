<template>
  <div class="article-nav-container" :class="{ 'is-sticky': isSmallScreen }" ref="navRef">
    <Tabs v-model="activeId" :direction="tabDirection" @tab-click="handleClick" class="nav-tabs">
      <TabItem name="综合" label="综合">
        <!-- Reserved icon slot example -->
        <!-- <template #icon><el-icon><Menu /></el-icon></template> -->
      </TabItem>
      <TabItem v-for="item in tags" :key="item.id" :name="item.id" :label="item.name" />
    </Tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { emitter, throttle } from '@/utils';
import useArticleStore from '@/stores/article.store';
import useRootStore from '@/stores/index.store';
import Tabs from '@/components/common/Tabs.vue';
import TabItem from '@/components/common/TabItem.vue';

const props = defineProps<{
  tags?: any[]; // Using any[] to match usage in Article.vue, essentially Itag[]
}>();

const rootStore = useRootStore();
const articleStore = useArticleStore();
const { isSmallScreen } = storeToRefs(rootStore);

const activeId = ref<string | number>('综合');
const navRef = ref<HTMLElement | null>(null);

// Direction logic
const tabDirection = computed(() => (isSmallScreen.value ? 'horizontal' : 'vertical'));

// Update CSS variable for ArticleList to know the nav height
const updateNavHeightVar = () => {
  if (isSmallScreen.value && navRef.value) {
    // 使用 offsetHeight 获取包含 padding/border 的完整高度
    const height = navRef.value.offsetHeight;
    document.documentElement.style.setProperty('--article-nav-height', `${height}px`);
  } else {
    document.documentElement.style.setProperty('--article-nav-height', '0px');
  }
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  emitter.on('changeTagInList', (tag: any) => {
    activeId.value = tag.id;
    rootStore.changeTag(tag.id);
  });
  emitter.on('submitSearchValue', () => (activeId.value = '综合'));

  // 使用 ResizeObserver 监听高度变化
  if (navRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateNavHeightVar();
    });
    resizeObserver.observe(navRef.value);
  }

  // Initial check
  updateNavHeightVar();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  document.documentElement.style.removeProperty('--article-nav-height');
});

const handleClick = throttle(function (name: string | number) {
  if (name) {
    rootStore.changePageNum(1);
    rootStore.changePageOrder('date');
    rootStore.changeTag(name === '综合' ? '' : name);
  } else {
    rootStore.changePageNum(1);
    rootStore.changePageOrder('date');
  }
  window.scrollTo(0, 0);
}, 300);
</script>

<style lang="scss" scoped>
.article-nav-container {
  /* Default vertical styles */
  width: 100%;

  &.is-sticky {
    /* position: sticky;  Moved to Article.vue */
    /* top: var(--navbarHeight); */
    /* z-index: 999; */
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    /* Ensure full width on small screens */
    width: 100%;
    /* Add some padding for horizontal scroll mode */
    padding: 0;
  }
}

.nav-tabs {
  /* Pass through styles if needed */
}
</style>
