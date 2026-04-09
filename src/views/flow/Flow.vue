<template>
  <div class="flow-page" ref="containerRef">
    <FlowCordWidget v-model="editorOpen" controls-id="flow-editor-panel" />

    <div class="flow-column">
      <div class="flow-editor-stack">
        <div id="flow-editor-panel" class="flow-editor-reveal" :class="{ 'is-open': editorOpen }" :inert="!editorOpen">
          <div class="flow-editor-reveal-inner">
            <div class="flow-editor-input">
              <TiptapEditorFlow @update:content="(html) => (flowDraft = html)" />
              <div class="flow-editor-publish">
                <el-button type="primary" plain disabled>发布</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pull-indicator" :style="{ height: `${pullDistance}px`, opacity: pullDistance > 10 ? 1 : 0 }">
        <div class="pull-indicator-content" :class="{ refreshing: isRefreshing, ready: pullReady }">
          <Loader2 :size="20" class="pull-icon" :class="{ spinning: isRefreshing }" />
          <span v-if="isRefreshing">刷新中…</span>
          <span v-else-if="pullReady">松开刷新</span>
          <span v-else>下拉刷新</span>
        </div>
      </div>

      <FlowFeed ref="feedRef" />
    </div>
  </div>
</template>
<script setup lang="ts">
import FlowFeed from './cpns/FlowFeed.vue';
import FlowCordWidget from './cpns/FlowCordWidget.vue';
import TiptapEditorFlow from '@/components/tiptap-editor-flow/TiptapEditorFlow.vue';
import { usePullToRefresh } from '@/composables/usePullToRefresh';
import { Loader2 } from 'lucide-vue-next';

const containerRef = ref<HTMLElement | null>(null);
const feedRef = ref<InstanceType<typeof FlowFeed> | null>(null);

const editorOpen = ref(false);
const flowDraft = ref('');

const { pullDistance, isRefreshing } = usePullToRefresh({
  containerRef,
  onRefresh: async () => {
    await feedRef.value?.refetch();
  },
});

const pullReady = computed(() => pullDistance.value >= 70);
</script>

<style lang="scss" scoped>
.flow-page {
  --flow-column-width: clamp(340px, 55vw, 880px);

  /* min-height 由 App.vue `.router-view` 统一提供 */
  display: flex;
  flex-direction: column;
  padding-top: 0;
  position: relative;

  .flow-column {
    flex: 1;
    min-height: 0;
    width: var(--flow-column-width);
    margin: 0 auto;
    padding: 0 16px 32px;
    border-inline: 1px solid color-mix(in oklch, var(--fontColor) 8%, transparent);
    container-type: inline-size;
  }

  .flow-editor-stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    padding-top: 0;
  }

  .flow-editor-reveal {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.44s cubic-bezier(0.16, 1, 0.3, 1);
    width: 100%;

    &.is-open {
      grid-template-rows: 1fr;
      margin-top: 4px;
      margin-bottom: 12px;
    }
  }

  .flow-editor-reveal-inner {
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* 与 CommentForm `.input` + `.input-action` 一致：按钮叠在编辑器右下 */
  .flow-editor-input {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .flow-editor-publish {
    position: absolute;
    bottom: 10px;
    right: 10px;
    display: flex;
    gap: 8px;
    z-index: 2;
    pointer-events: auto;
  }

  :deep(.flow-editor-content) {
    padding-bottom: 50px;
  }

  .pull-indicator {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    transition: opacity 0.15s ease;

    .pull-indicator-content {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 10px;
      font-size: 13px;
      color: color-mix(in oklch, var(--fontColor) 55%, transparent);
      transition: color 0.2s ease;

      &.ready {
        color: var(--fontColor);
      }

      &.refreshing {
        color: color-mix(in oklch, var(--fontColor) 70%, transparent);
      }

      .pull-icon {
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

        &.spinning {
          animation: spin 0.8s linear infinite;
        }
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

html.dark .flow-page .flow-column {
  border-color: color-mix(in oklch, var(--fontColor) 10%, transparent);
}
</style>
