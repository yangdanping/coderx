<template>
  <div class="article-list" ref="articleListRef">
    <h3 class="result" v-if="searchValue">
      <el-icon class="back" @click="goBack"><IBack /></el-icon>
      搜索:"{{ searchValue }}"
    </h3>

    <template v-if="!noSearchData">
      <div class="list-order">
        <div class="btn" @click="setOrder('date')" :class="{ active: pageOrder === 'date' }">最新</div>
        <div class="btn" @click="setOrder('hot')" :class="{ active: pageOrder === 'hot' }">热门</div>
      </div>

      <template v-for="item in articles?.result" :key="item.id">
        <ListItem :item="item">
          <template #action>
            <ArticleAction :article="item" />
          </template>
        </ListItem>
      </template>

      <!-- 触底哨兵 + 状态区域 -->
      <div ref="infiniteSentinel" class="infinite-sentinel"></div>
      <!-- 状态区域 -->
      <el-skeleton v-if="isListLoading" animated />
      <div v-if="!hasMore && articles?.result?.length" class="no-more">没有更多了</div>
    </template>
    <template v-else>
      <h2 class="msg">coderX还没有"{{ searchValue }}"的相关内容</h2>
    </template>
  </div>
</template>

<script lang="ts" setup>
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import useRootStore from '@/stores/index.store';
import useArticleStore from '@/stores/article.store';
import useLoadingStore from '@/stores/loading.store';
import { emitter, throttle } from '@/utils';

import type { IArticles } from '@/stores/types/article.result';

const articleStore = useArticleStore();
const rootStore = useRootStore();
const loadingStore = useLoadingStore();
const loadingKey = 'article.list';
const { pageOrder } = storeToRefs(rootStore);
const { hasMore } = storeToRefs(articleStore);
const articleListRef = ref<HTMLElement | null>(null);
const searchValue = ref<string>('');
const noSearchData = ref(false);
const { articles = {} } = defineProps<{ articles?: IArticles }>();

// 使用 IntersectionObserver 实现触底加载
const infiniteSentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
// let started = ref(false); // 用户首次滚动后再开始监听
// let skipFirstIntersect = ref(true); // 忽略启动后的第一次相交，避免首次就加载

// 绑定全局 loading（文章列表）
const isListLoading = computed(() => loadingStore.isLoading(loadingKey));
watch(
  () => isListLoading.value,
  (newValue) => {
    console.log('isListLoading newValue------', newValue);
  },
);

onMounted(() => {
  // 设置搜索字符串
  emitter.on('submitSearchValue', (value) => (searchValue.value = value as string));
  emitter.on('changeTagInNav', () => (searchValue.value = ''));
  // 设置触底监听
  observer = new IntersectionObserver(
    async (entries) => {
      const isIntersecting = entries[0]?.isIntersecting;
      console.log('触底监听------', 'isIntersecting', isIntersecting, 'isListLoading', isListLoading.value, 'hasMore', hasMore.value);
      if (!isIntersecting || !hasMore.value) return;
      const extraParams = searchValue.value ? { keywords: searchValue.value, loadingKey } : { loadingKey };
      await articleStore.loadMoreAction(extraParams);
    },
    { root: null, rootMargin: '0px 0px 50px 0px', threshold: 0 }, // 分别代表视口元素,提前 50px 触发,元素一进入即触发
  );

  window.addEventListener('scroll', onUserFirstScroll, { passive: true });
  // window.addEventListener('wheel', onUserFirstScroll, { passive: true });
});

// 首次需要用户产生滚动后，才开始观察，避免刷新即触发
const onUserFirstScroll = () => {
  infiniteSentinel.value && observer?.observe(infiniteSentinel.value);
};

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
  // 清理监听
  // 可能用户未滚动过，确保移除
  window.removeEventListener('scroll', onUserFirstScroll);
  // window.removeEventListener('wheel', onUserFirstScroll);
});

watch(
  () => articles,
  (newV) => {
    if (searchValue.value) {
      if (newV.result?.length) {
        noSearchData.value = false;
      } else {
        noSearchData.value = true;
      }
    }
  },
);

const goBack = () => {
  noSearchData.value = false;
  searchValue.value = '';
  articleStore.refreshFirstPageAction({ loadingKey });
};

const emit = defineEmits(['tabClick']);

const setOrder = throttle(function (order: string) {
  noSearchData.value && (noSearchData.value = false);
  rootStore.changePageNum(1);
  rootStore.changePageOrder(order);
  emit('tabClick', order);
  window.scrollTo(0, 0);
}, 1000);
</script>

<style lang="scss" scoped>
.article-list {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  backdrop-filter: blur(10px);
  border-radius: 5px;
  animation: moveDown 0.5s forwards;
  .msg {
    margin-top: 100px;
  }
  .result {
    position: absolute;
    top: 0;
    left: 50px;
    display: flex;
    align-items: center;
    z-index: 99;
    color: #5f5f5f;
    .back {
      font-size: 25px;
      margin-right: 8px;
      cursor: pointer;
    }
  }
  .list-order {
    position: sticky;
    top: calc(var(--navbarHeight));
    width: 100%;
    display: flex;
    justify-content: left;
    background-color: #fff;
    z-index: 999;
    .btn {
      display: flex;
      background-color: rgba(255, 255, 255, 0.5);
      align-items: center;
      justify-content: center;
      height: 30px;
      width: 60px;
      margin-left: 10px;
      cursor: pointer;
      &.active {
        border-bottom: 2px solid #409eff;
        color: #409eff;
      }
    }
  }

  .infinite-sentinel {
    height: 1px;
    width: 100%;
  }

  .loading,
  .no-more {
    color: #8c8c8c;
    margin: 12px 0;
  }
}
</style>
