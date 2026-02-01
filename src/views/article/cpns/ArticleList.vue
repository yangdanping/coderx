<template>
  <div class="article-list" ref="articleListRef">
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
      <h2 class="no-data">coderX还没有"{{ currentTagName }}"的相关内容</h2>
    </template>

    <!-- 
      状态四：有数据，正常显示列表
    -->
    <template v-else>
      <div class="list-order">
        <div class="btn" role="button" @click="setOrder('date')" :class="{ active: pageOrder === 'date' }">最新</div>
        <div class="btn" role="button" @click="setOrder('hot')" :class="{ active: pageOrder === 'hot' }">热门</div>
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
              <ArticleAction :article="item" :isLiked="isLiked" :onLike="likeArticle" />
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
import useArticleStore from '@/stores/article.store';
import { useArticleList, useUserLikedArticles, useLikeArticle } from '@/composables/useArticleList';
import { throttle } from '@/utils';
import type { IUseArticleListParams } from '@/composables/useArticleList';

// --- 1. 准备参数 ---
const rootStore = useRootStore();
const articleStore = useArticleStore();
const { pageOrder, tagId } = storeToRefs(rootStore);
const { tags } = storeToRefs(articleStore);

// 构建响应式参数对象（仅保留 tagId 和 pageOrder，搜索逻辑已移至 /search 路由）
const requestParams = computed<IUseArticleListParams>(() => ({
  pageOrder: pageOrder.value,
  tagId: tagId.value,
}));

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

// --- 用户点赞状态 ---
const { isLiked } = useUserLikedArticles();

// --- 点赞操作 ---
const { mutate: likeArticle } = useLikeArticle(requestParams);

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

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});

// --- 4. 交互逻辑 ---
// 切换排序
// 这里也不需要手动调 refreshFirstPageAction
// 因为 pageOrder 变了 -> requestParams 变了 -> useArticleList 自动重置
const setOrder = throttle(function (order: string) {
  rootStore.changePageNum(1); // 仅用于同步 Store 里的页码显示(如果有的话)，对请求无影响
  rootStore.changePageOrder(order);
  articleStore.activeOrder = order; // 记忆排序方式
  window.scrollTo(0, 0);
}, 300);
</script>

<style lang="scss" scoped>
.article-list {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 
     使用 clamp() 优化容器最大宽度：
     - 最小值: 320px (保证在极小屏幕下也有起码的宽度)
     - 理想值: 50vw (保证默认情况下占据大部分屏幕宽度)
     - 最大值: 1150px (保持原有的在大屏下的最佳阅读宽度)
  */
  width: clamp(320px, 50vw, 1150px);
  min-width: 100%;
  margin: 0 auto;
  border-radius: 5px;
  @include glass-effect;
  animation: moveDown 0.5s forwards;
  // 注意：不能设置 overflow-x: hidden，否则会导致 .list-order 的 sticky 失效

  .no-data {
    margin-top: 100px;
    text-align: center;
    padding: 0 16px;
    // 移动端调整
    @media (max-width: 480px) {
      margin-top: 60px;
      font-size: 16px;
    }
  }

  .list-order {
    position: sticky;
    top: calc(var(--navbarHeight) + var(--article-nav-height, 0px));
    display: flex;
    justify-content: flex-start;
    padding-left: 10px;
    gap: 10px;
    width: 100%;
    // 使用 CSS 变量，支持 dark 模式
    background: linear-gradient(to right, var(--bg-primary), transparent);
    z-index: var(--z-sticky);
    .btn {
      display: flex;
      background-color: var(--glass-bg);
      align-items: center;
      justify-content: center;
      height: 30px;
      width: 60px;
      cursor: pointer;
      &.active {
        border-bottom: 2px solid var(--el-color-primary);
        color: var(--el-color-primary);
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
    text-align: center;
  }

  .error {
    color: #f56c6c;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 0 16px;
  }

  // 骨架屏居中显示
  :deep(.el-skeleton) {
    align-self: center;
    padding: 0 16px;
    max-width: 100%;
    // 移动端调整
    @media (max-width: 480px) {
      padding: 0 32px;
    }
  }
}
</style>
