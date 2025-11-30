<template>
  <div class="comment-list">
    <span ref="listRef" class="comment-title">最新评论({{ totalCount }})</span>

    <!-- 首次加载中(查询第一次执行，还没有任何缓存数据) -->
    <template v-if="isPending">
      <el-skeleton animated :count="3" />
    </template>

    <!-- 加载失败 -->
    <template v-else-if="isError">
      <div class="error">
        <span>加载评论失败</span>
        <el-button @click="refetch as any" type="primary" size="small">重试</el-button>
      </div>
    </template>

    <!-- 评论列表 -->
    <template v-else-if="comments.length">
      <template v-for="(item, index) in comments" :key="item.id">
        <CommentListItem :item="item" :floor="comments.length - index" />
      </template>

      <!-- 底部加载状态 -->
      <el-skeleton v-if="isFetchingNextPage" animated />
      <div v-else-if="!hasNextPage" class="no-more">没有更多评论了</div>
    </template>

    <!-- 空状态 -->
    <template v-else>
      <h1 class="no-data">评论区暂时为空~发表你的第一条评论吧~</h1>
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

const route = useRoute();
// 使用 composable 获取评论列表
const { data, isPending, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useCommentList(route.params.articleId as string);

// 计算属性：扁平化的评论列表
const comments = computed(() => flattenComments(data.value));

// 计算属性：评论总数
const totalCount = computed(() => getTotalCount(data.value));

// 滚动到评论区
const listRef = ref<Element>();

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
      const shouldFetchNextPage = entry.isIntersecting && hasNextPage.value && !isFetchingNextPage.value;
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

onBeforeUnmount(() => {
  emitter.off('gotoCom');
  observer?.disconnect();
  observer = null;
});
</script>

<style lang="scss" scoped>
.comment-list {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  margin-bottom: 300px;
  border-radius: 5px;
  padding: 10px;

  .comment-title {
    font-weight: 300;
    font-size: 30px;
    padding-top: var(--navbarHeight);
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
    padding: 40px 0;
    color: #666;
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
