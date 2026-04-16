<template>
  <div class="comment-list">
    <div v-if="totalCount" ref="listRef" class="comment-header">
      <span class="comment-title">最新评论({{ totalCount }})</span>
      <el-dropdown trigger="click" @command="handleSortChange">
        <button class="sort-trigger" type="button" aria-label="切换评论排序">
          <span>{{ currentSortLabel }}</span>
          <el-icon><ChevronDown :size="16" /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="option in sortOptions" :key="option.value" :command="option.value" :disabled="option.value === sortType">
              {{ option.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 首次加载中(查询第一次执行，还没有任何缓存数据) -->
    <template v-if="isPending">
      <el-skeleton animated :count="3" />
    </template>

    <!-- 加载失败 -->
    <template v-else-if="isError">
      <div class="error">
        <span>加载评论失败</span>
        <el-button @click="refetch as any" type="primary" plain size="small">重试</el-button>
      </div>
    </template>

    <!-- 评论列表 -->
    <template v-else-if="comments.length">
      <CommentListItem v-for="(item, index) in comments" :key="`${sortType}-${item.id}`" :item="item" :floor="comments.length - index" />

      <!-- 底部加载状态 -->
      <el-skeleton v-if="isFetchingNextPage" animated />
      <div v-else-if="!hasNextPage" class="no-more">没有更多评论了</div>
    </template>

    <!-- 空状态 -->
    <template v-else>
      <span class="no-data">评论区暂时为空~发表你的第一条评论吧~</span>
    </template>

    <!-- 触底哨兵 - 移出条件块，确保始终存在于 DOM 中 -->
    <div ref="loadMoreRef" class="load-more-sentinel"></div>
  </div>
</template>

<script lang="ts" setup>
import { useCommentList, flattenComments, getTotalCount } from '@/composables/useCommentList';
import CommentListItem from './CommentListItem.vue';
import { emitter } from '@/utils';
import { useRoute } from 'vue-router';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import { ChevronDown } from 'lucide-vue-next';

import type { CommentSortType } from '@/service/comment/comment.request';

const sortOptions: Array<{ label: string; value: CommentSortType }> = [
  { label: '最新', value: 'latest' },
  { label: '最旧', value: 'oldest' },
  { label: '热门', value: 'hot' },
];

const route = useRoute();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { article } = storeToRefs(articleStore);
const articleId = computed(() => String(route.params.articleId ?? ''));
const sortType = ref<CommentSortType>('latest');
const currentSortLabel = computed(() => sortOptions.find((item) => item.value === sortType.value)?.label ?? '最新');
// 使用 composable 获取评论列表
const { data, isPending, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useCommentList(articleId, sortType);

// 计算属性：扁平化的评论列表
const comments = computed(() => flattenComments(data.value));

// 计算属性：评论总数
const totalCount = computed(() => getTotalCount(data.value));

// 监听评论总数变化，并同步到 ArticleStore,为detail-panel所用
watch(
  () => totalCount.value,
  (newCount) => {
    if (article.value?.id != null) {
      article.value.commentCount = newCount;
    }
  },
);

// 监听文章ID变化，重置评论排序和关闭所有表单
watch(articleId, (newArticleId, oldArticleId) => {
  if (!newArticleId || newArticleId === oldArticleId) return;
  sortType.value = 'latest';
  commentStore.closeAllForms();
});

// 滚动到评论区
const listRef = ref<Element>();

const handleSortChange = (value: CommentSortType) => {
  if (value === sortType.value) return;
  commentStore.closeAllForms();
  sortType.value = value;
};

// 触底加载更多（Intersection Observer）
const loadMoreRef = ref<Element>();
let observer: IntersectionObserver | null = null;

onMounted(() => {
  // 滚动事件监听
  emitter.on('gotoCom', () => listRef.value?.scrollIntoView({ behavior: 'smooth' }));

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
    if (loadMoreRef.value) observer?.observe(loadMoreRef.value);
  });
});

onUnmounted(() => {
  emitter.off('gotoCom');
  observer?.disconnect();
  observer = null;
});
</script>

<style lang="scss" scoped>
.comment-list {
  @include glass-effect;
  margin-bottom: 300px;
  padding: 20px;
  border-top: 2px dashed var(--el-border-color);

  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .comment-title {
    font-weight: 300;
    font-size: 20px;
  }

  .sort-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    background-color: transparent;
    color: var(--el-text-color-primary);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background-color 0.2s ease;

    &:hover {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-5);
      background-color: var(--el-color-primary-light-9);
    }
  }

  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 10px;
  }

  .no-data {
    text-align: center;
    font-size: 24px;
    padding: 100px 0;
  }

  .no-more {
    text-align: center;
    font-size: 14px;
    padding: 20px;
    color: #999;
  }

  .load-more-sentinel {
    height: 1px;
    width: 100%;
  }
}
</style>
