<template>
  <div class="search-page">
    <NavBar />
    <div class="search-container">
      <!-- 搜索结果统计 -->
      <div v-if="keywords && !isPending" class="search-stats">
        <span class="keyword">"{{ keywords }}"</span>
        <span class="count">共找到 {{ totalCount }} 篇相关文章</span>
      </div>

      <!-- 搜索结果列表 -->
      <div class="search-results">
        <!-- 状态一：加载中 -->
        <el-skeleton v-if="isPending" animated :rows="5" />

        <!-- 状态二：错误 -->
        <div v-else-if="isError" class="error">
          加载失败: {{ error?.message }}
          <el-button link type="primary" @click="() => refetch()">重试</el-button>
        </div>

        <!-- 状态三：空状态 -->
        <div v-else-if="isListEmpty" class="empty-state">
          <el-empty :description="emptyDescription" />
        </div>

        <!-- 状态四：有数据 -->
        <template v-else>
          <div class="list-order">
            <div class="btn" @click="setOrder('date')" :class="{ active: pageOrder === 'date' }">最新</div>
            <div class="btn" @click="setOrder('hot')" :class="{ active: pageOrder === 'hot' }">热门</div>
          </div>

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
          <el-skeleton v-if="isFetchingNextPage" animated />
          <div v-else-if="!hasNextPage" class="no-more">没有更多了</div>
        </template>

        <!-- 触底哨兵 -->
        <div ref="infiniteSentinel" class="infinite-sentinel"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import { useArticleList, useUserLikedArticles, useLikeArticle } from '@/composables/useArticleList';
import { throttle } from '@/utils';
import type { IUseArticleListParams } from '@/composables/useArticleList';

const route = useRoute();
const pageOrder = ref('date');

// 从 URL 获取搜索词
const keywords = computed(() => (route.query.q as string) || '');

// 构建请求参数
const requestParams = computed<IUseArticleListParams>(() => ({
  keywords: keywords.value,
  pageOrder: pageOrder.value,
}));

// 调用 useArticleList hook
const { data, fetchNextPage, hasNextPage, isPending, isFetchingNextPage, isError, error, refetch } = useArticleList(requestParams);

// 用户点赞状态
const { isLiked } = useUserLikedArticles();

// 点赞操作
const { mutate: likeArticle } = useLikeArticle(requestParams);

// 计算总数
const totalCount = computed(() => data.value?.pages[0]?.total ?? 0);

// 判断列表是否为空
const isListEmpty = computed(() => {
  if (isPending.value) return false;
  if (!keywords.value) return true; // 没有搜索词时显示空状态
  const firstPage = data.value?.pages[0];
  return !firstPage?.result || firstPage.result.length === 0;
});

// 空状态描述文字
const emptyDescription = computed(() => {
  return keywords.value ? `未找到与"${keywords.value}"相关的文章` : '请输入关键词开始搜索';
});

// 切换排序
const setOrder = throttle((order: string) => {
  pageOrder.value = order;
  window.scrollTo(0, 0);
}, 300);

// 触底加载
const infiniteSentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    async (entries) => {
      const entry = entries[0];
      const shouldFetch = entry?.isIntersecting && hasNextPage.value && !isFetchingNextPage.value;
      if (shouldFetch) {
        await fetchNextPage();
      }
    },
    { threshold: 0.1 },
  );

  nextTick(() => {
    if (infiniteSentinel.value) observer?.observe(infiniteSentinel.value);
  });
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  /* background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); */
}

.search-container {
  max-width: 1150px;
  margin: 0 auto;
  padding: 80px 20px 40px;
}

.search-stats {
  text-align: center;
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;

  .keyword {
    color: #409eff;
    font-weight: 600;
    margin-right: 8px;
  }

  .count {
    color: #999;
  }
}

.search-results {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  min-height: 400px;

  .list-order {
    position: sticky;
    top: calc(var(--navbarHeight));
    display: flex;
    justify-content: flex-start;
    padding-left: 10px;
    gap: 10px;
    width: 100%;
    background: linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
    z-index: 999;
    .btn {
      display: flex;
      background-color: rgba(255, 255, 255, 0.5);
      align-items: center;
      justify-content: center;
      height: 30px;
      width: 60px;
      cursor: pointer;
      &.active {
        border-bottom: 2px solid #409eff;
        color: #409eff;
      }
    }
  }

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }

  .error {
    color: #f56c6c;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 200px;
  }

  .no-more {
    text-align: center;
    color: #999;
    padding: 20px;
    font-size: 14px;
  }

  .infinite-sentinel {
    height: 1px;
    width: 100%;
  }
}
</style>
