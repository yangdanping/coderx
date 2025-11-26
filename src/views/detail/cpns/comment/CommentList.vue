<template>
  <div class="comment-list">
    <span ref="listRef" class="comment-title">最新评论({{ totalCount }})</span>

    <!-- 加载中 -->
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

      <!-- 加载更多 -->
      <div class="load-more" ref="loadMoreRef">
        <template v-if="isFetchingNextPage">
          <el-icon class="is-loading"><ILoading /></el-icon>
          <span>加载中...</span>
        </template>
        <template v-else-if="hasNextPage">
          <el-button @click="fetchNextPage()" type="primary" text>加载更多评论</el-button>
        </template>
        <template v-else>
          <span class="no-more">没有更多评论了</span>
        </template>
      </div>
    </template>

    <!-- 空状态 -->
    <template v-else>
      <h1 class="skeleton">评论区暂时为空~发表你的第一条评论吧~</h1>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useCommentList, flattenComments, getTotalCount } from '@/composables/useCommentList';
import CommentListItem from './CommentListItem.vue';
import { emitter } from '@/utils';
import { useRoute } from 'vue-router';

const route = useRoute();
const articleId = computed(() => String(route.params.articleId || ''));

// 使用 composable 获取评论列表
const { data, isPending, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useCommentList(articleId);

// 计算属性：扁平化的评论列表
const comments = computed(() => flattenComments(data.value));

// 计算属性：评论总数
const totalCount = computed(() => getTotalCount(data.value));

// 滚动到评论区
const listRef = ref<Element>();
onMounted(() => {
  emitter.on('gotoCom', () => {
    listRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
});
onBeforeUnmount(() => {
  emitter.off('gotoCom');
});

// 触底加载更多（Intersection Observer）
const loadMoreRef = ref<Element>();
let observer: IntersectionObserver | null = null;

// 监听 loadMoreRef，当元素出现时创建 observer
watch(
  loadMoreRef,
  (el) => {
    // 清理旧的 observer
    if (observer) {
      observer.disconnect();
    }

    if (el) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && hasNextPage.value && !isFetchingNextPage.value) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(el);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<style lang="scss" scoped>
.comment-list {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  margin-bottom: 300px;
  border-radius: 5px;
  padding: 10px;
}

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

.load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  gap: 8px;
}

.no-more {
  color: #999;
  font-size: 14px;
}

.skeleton {
  text-align: center;
  padding: 40px 0;
  color: #666;
}
</style>
