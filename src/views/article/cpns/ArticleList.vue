<template>
  <div class="article-list" ref="articleListRef">
    <!-- 搜索状态栏 -->
    <h3 class="result" v-if="searchValue">
      <el-icon class="back" @click="goBack"><IBack /></el-icon>
      搜索:"{{ searchValue }}"
    </h3>

    <!-- 
      状态一：加载中 (初始加载)
      对应 TanStack Query 的 isPending (且非 isFetchingNextPage)
    -->
    <el-skeleton v-if="isPending" animated :rows="5" />

    <!-- 
      状态二：错误
      对应 TanStack Query 的 isError
    -->
    <div v-else-if="isError" class="error">
      加载失败: {{ error?.message }}
      <el-button link type="primary" @click="() => refetch()">重试</el-button>
    </div>

    <!-- 
      状态三：无数据 (空状态)
      数据加载完了，但是结果为空
    -->
    <template v-else-if="isListEmpty">
      <h2 class="no-data">coderX还没有"{{ searchValue || currentTagName }}"的相关内容</h2>
    </template>

    <!-- 
      状态四：有数据，正常显示列表
    -->
    <template v-else>
      <div class="list-order">
        <div class="btn" @click="setOrder('date')" :class="{ active: pageOrder === 'date' }">最新</div>
        <div class="btn" @click="setOrder('hot')" :class="{ active: pageOrder === 'hot' }">热门</div>
      </div>

      <!-- 
        数据渲染
        TanStack Query 返回的 data 是分页数组: { pages: [page1, page2, ...] }
        我们需要遍历每一页 (page) 和每一页里的列表 (page.result)
      -->
      <template v-for="(page, pageIndex) in data?.pages" :key="pageIndex">
        <template v-for="item in page.result" :key="item.id">
          <ListItem :item="item">
            <template #action>
              <ArticleAction :article="item" />
            </template>
          </ListItem>
        </template>
      </template>

      <!-- 底部加载状态 -->
      <!-- 对应 TanStack Query 的 isFetchingNextPage -->
      <el-skeleton v-if="isFetchingNextPage" animated />

      <!-- 没有更多数据 -->
      <!-- 对应 !hasNextPage -->
      <div v-else-if="!hasNextPage" class="no-more">没有更多了</div>
    </template>

    <!-- 触底哨兵 - 移出 v-if/else 结构，确保始终存在于 DOM 中 -->
    <div ref="infiniteSentinel" class="infinite-sentinel"></div>
  </div>
</template>

<script lang="ts" setup>
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import useRootStore from '@/stores/index.store';
import useArticleStore from '@/stores/article.store'; // 引入 articleStore
import { useArticleList } from '@/composables/useArticleList'; // 引入我们封装的 Composable
import { emitter, throttle } from '@/utils';
import type { IUseArticleListParams } from '@/composables/useArticleList';

// --- 1. 准备参数 ---
const rootStore = useRootStore();
const articleStore = useArticleStore(); // 获取 articleStore 实例
const { pageOrder, tagId } = storeToRefs(rootStore);
const { tags } = storeToRefs(articleStore); // 获取标签列表
const searchValue = ref('');

// 构建响应式参数对象
// 这里的 params 会被传入 useInfiniteQuery
// 只要这里的属性发生变化，TanStack Query 会自动重置并重新请求
const requestParams: Ref<IUseArticleListParams> | any = computed(() => {
  return {
    keywords: searchValue.value,
    pageOrder: pageOrder.value,
    tagId: tagId.value,
    // 其他参数如 userId 等也可以加在这里
  };
});

// --- 2. 调用 Composable (核心逻辑) ---
// 这里替代了原本 Store 里的 loadMoreAction, loadingStore, hasMore 等所有逻辑
const {
  data, // 包含所有分页数据的对象 { pages: [...] }
  fetchNextPage, // 加载下一页的函数
  hasNextPage, // 是否有下一页 (布尔值)
  isPending, // 是否正在进行初始加载 (第一次请求)
  isFetchingNextPage, // 是否正在加载下一页 (触底加载)
  isError, // 是否出错
  error, // 错误对象
  refetch, // 手动重新加载函数
} = useArticleList(requestParams);

// 判断列表是否为空,如果数据加载完成了 (非 pending)，且第一页的结果为空，则视为空列表
const isListEmpty = computed(() => {
  if (isPending.value) return false;
  const firstPage = data.value?.pages[0];
  return !firstPage?.result || firstPage.result.length === 0;
});

// 获取当前选中的标签名称
const currentTagName = computed(() => {
  if (!tagId.value) return '';
  const targetTag = tags.value.find((tag) => tag.id === tagId.value);
  return targetTag ? targetTag.name : '';
});

// --- 3. 触底加载逻辑 ---
const infiniteSentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  // 事件监听 (保持原有逻辑)
  emitter.on('submitSearchValue', (value) => (searchValue.value = value as string));
  emitter.on('changeTagInNav', () => (searchValue.value = ''));

  // 设置触底监听
  observer = new IntersectionObserver(
    async (entries) => {
      const entry = entries[0];
      // ✅ 触发条件：元素可见 + 有更多数据 + 当前未在加载
      const shouldFetchNextPage = entry?.isIntersecting && hasNextPage.value && !isFetchingNextPage.value;
      if (shouldFetchNextPage) {
        await fetchNextPage();
      }
    },
    { threshold: 0.1 }, // 预加载距离
  );

  // 延迟启动观察
  nextTick(() => {
    if (infiniteSentinel.value) observer?.observe(infiniteSentinel.value);
  });
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

// --- 4. 交互逻辑 ---
// 返回逻辑变得非常简单：只需要清空搜索词
// 由于 requestParams 依赖 searchValue，清空后 useArticleList 会自动重置回第一页
const goBack = () => {
  searchValue.value = '';
};

const emit = defineEmits(['tabClick']);

// 切换排序
// 这里也不需要手动调 refreshFirstPageAction
// 因为 pageOrder 变了 -> requestParams 变了 -> useArticleList 自动重置
const setOrder = throttle(function (order: string) {
  rootStore.changePageNum(1); // 仅用于同步 Store 里的页码显示(如果有的话)，对请求无影响
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
  .no-data {
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
  .no-more,
  .error {
    color: #8c8c8c;
    margin: 12px 0;
  }

  .error {
    color: #f56c6c;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
