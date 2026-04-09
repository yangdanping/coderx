<template>
  <div class="flow-feed">
    <!-- 初始加载 -->
    <FlowFeedSkeleton v-if="isPending" :count="4" />

    <!-- 错误 -->
    <div v-else-if="isError" class="feed-error">
      <p>加载失败: {{ error?.message }}</p>
      <button class="retry-btn" role="button" @click="refetch()">
        <RefreshCw :size="14" />
        重试
      </button>
    </div>

    <!-- 空态 -->
    <div v-else-if="isEmpty" class="feed-empty">
      <div class="empty-visual">📝</div>
      <h3>还没有人分享动态</h3>
      <p>试试发一条，让大家认识你</p>
    </div>

    <!-- 正常列表 -->
    <template v-else>
      <template v-for="(page, pageIdx) in data?.pages" :key="pageIdx">
        <FlowFeedItem v-for="item in page.items" :key="item.id" :item="item" />
      </template>

      <FlowFeedSkeleton v-if="isFetchingNextPage" :count="2" />

      <div v-else-if="!hasNextPage" class="feed-end">已经到底了</div>
    </template>

    <div ref="infiniteSentinel" class="infinite-sentinel" />
  </div>
</template>
<script setup lang="ts">
import FlowFeedItem from './FlowFeedItem.vue';
import FlowFeedSkeleton from './FlowFeedSkeleton.vue';
import { useFlowFeed } from '@/composables/useFlowFeed';
import { RefreshCw } from 'lucide-vue-next';

const { data, isPending, isFetchingNextPage, isError, error, hasNextPage, fetchNextPage, refetch } = useFlowFeed();

const isEmpty = computed(() => {
  if (isPending.value) return false;
  const first = data.value?.pages[0];
  return !first?.items || first.items.length === 0;
});

const infiniteSentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasNextPage.value && !isFetchingNextPage.value) {
        fetchNextPage();
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

defineExpose({ refetch });
</script>

<style lang="scss" scoped>
.flow-feed {
  display: flex;
  flex-direction: column;
  min-height: 200px;

  .feed-error {
    text-align: center;
    padding: 48px 16px;
    color: var(--fontColor);

    p {
      margin-bottom: 12px;
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border: 1px solid color-mix(in oklch, var(--fontColor) 20%, transparent);
      background: transparent;
      color: var(--text-primary);
      font-size: 13px;
      transition: background 0.2s ease;

      &:hover {
        background: color-mix(in oklch, var(--fontColor) 6%, transparent);
      }
    }
  }

  .feed-empty {
    text-align: center;
    padding: 72px 16px 48px;
    color: var(--fontColor);

    .empty-visual {
      font-size: 48px;
      margin-bottom: 16px;
    }

    h3 {
      font-size: 17px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 6px;
    }

    p {
      font-size: 14px;
      opacity: 0.65;
    }
  }

  .feed-end {
    text-align: center;
    padding: 20px 0 8px;
    font-size: 13px;
    color: color-mix(in oklch, var(--fontColor) 50%, transparent);
  }

  .infinite-sentinel {
    height: 1px;
    width: 100%;
  }
}
</style>
