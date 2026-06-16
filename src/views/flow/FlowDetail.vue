<template>
  <div class="flow-detail-page">
    <main class="flow-detail-column">
      <header class="detail-header">
        <button class="back-button" type="button" aria-label="返回 Flow" @click="goBack">
          <ArrowLeft :size="21" />
        </button>
        <h1>动态</h1>
      </header>

      <FlowFeedSkeleton v-if="loading" :count="1" />

      <FlowFeedItem v-else-if="item" :item="item" :navigable="false" />

      <div v-else class="detail-empty">
        <p>这条动态不存在或已被移除。</p>
        <button type="button" @click="router.push('/flow')">返回 Flow</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import FlowFeedItem from './cpns/FlowFeedItem.vue';
import FlowFeedSkeleton from './cpns/FlowFeedSkeleton.vue';
import { getFlowItemById } from '@/service/flow/flow.request';

import type { FlowItem } from '@/service/flow/flow.types';

const props = defineProps<{
  flowId: string;
}>();

const router = useRouter();
const item = ref<FlowItem | null>(null);
const loading = ref(true);

async function loadItem() {
  loading.value = true;
  item.value = await getFlowItemById(Number(props.flowId));
  loading.value = false;
}

function goBack() {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.push('/flow');
}

watch(() => props.flowId, loadItem, { immediate: true });
</script>

<style lang="scss" scoped>
.flow-detail-page {
  --flow-column-width: clamp(340px, 55vw, 880px);
  display: flex;
  justify-content: center;
  min-height: calc(100vh - var(--navbarHeight));
}

.flow-detail-column {
  position: relative;
  isolation: isolate;
  width: var(--flow-column-width);
  padding: 0 16px 48px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border-inline: 1px solid color-mix(in oklch, var(--fontColor) 8%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 72px), transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 72px), transparent 100%);
  }
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  border-bottom: 1px solid var(--border-color-list);

  h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.back-button,
.detail-empty button {
  border: 0;
  background: transparent;
  color: var(--text-primary);
}

.back-button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;

  &:hover {
    background: color-mix(in oklch, var(--fontColor) 8%, transparent);
  }
}

.detail-empty {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 320px;
  color: var(--fontColor);

  button {
    text-decoration: underline;
  }
}
</style>
