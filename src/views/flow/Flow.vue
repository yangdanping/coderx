<template>
  <div class="flow-page" ref="containerRef">
    <FlowCordWidget ref="cordRef" v-model="editorOpen" controls-id="flow-editor-panel" />
    <FlowEditorModal
      :open="editorOpen"
      :content="flowDraft"
      :document="flowDraftDocument"
      :draft-status="flowDraftAutosave.status.value"
      :draft-status-text="flowDraftAutosave.statusText.value"
      :draft-error="flowDraftAutosave.errorMessage.value"
      :has-draft="flowDraftAutosave.hasDraft.value"
      :clear-disabled="flowDraftAutosave.isSaving.value || flowDraftAutosave.isClearing.value || flowDraftAutosave.isHydrating.value"
      :editor-disabled="flowDraftAutosave.isClearing.value"
      controls-id="flow-editor-panel"
      @close="editorOpen = false"
      @update:content="flowDraft = $event"
      @update:document="handleFlowDocumentUpdate"
      @clear-draft="handleClearFlowDraft"
      @after-close="restoreCordFocus"
    />

    <div class="flow-column" :inert="editorOpen" :aria-hidden="editorOpen ? 'true' : undefined">
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
import FlowEditorModal from './cpns/FlowEditorModal.vue';
import { normalizeFlowDraftDocument, useFlowDraftAutosave } from '@/composables/useFlowDraftAutosave';
import { usePullToRefresh } from '@/composables/usePullToRefresh';
import useUserStore from '@/stores/user.store';
import { LocalCache, Msg } from '@/utils';
import { ElMessageBox } from 'element-plus';
import { Loader2 } from '@lucide/vue';

import type { TiptapDocContent } from '@/service/draft/draft.types';

const containerRef = ref<HTMLElement | null>(null);
const feedRef = ref<InstanceType<typeof FlowFeed> | null>(null);
const cordRef = ref<InstanceType<typeof FlowCordWidget> | null>(null);

const editorOpen = shallowRef(false);
const flowDraft = shallowRef('');
const flowDraftDocument = shallowRef<TiptapDocContent>();

const userStore = useUserStore();
const normalizedUserId = Number(userStore.userInfo.id);
const flowDraftUserId = Number.isSafeInteger(normalizedUserId) && normalizedUserId > 0 ? normalizedUserId : null;
const flowDraftAutosave = useFlowDraftAutosave({
  userId: flowDraftUserId,
  canSync: Boolean(flowDraftUserId && (userStore.token || LocalCache.getCache('token'))),
  debounceMs: 1200,
});

const { pullDistance, isRefreshing } = usePullToRefresh({
  containerRef,
  onRefresh: async () => {
    await feedRef.value?.refetch();
  },
});

const pullReady = computed(() => pullDistance.value >= 70);

function restoreCordFocus() {
  cordRef.value?.focusHandle();
}

function handleFlowDocumentUpdate(document: TiptapDocContent) {
  const normalizedDocument = normalizeFlowDraftDocument(document);
  flowDraftDocument.value = normalizedDocument;
  flowDraftAutosave.recordSnapshot({
    content: normalizedDocument,
    meta: {
      imageIds: [],
      videoIds: [],
    },
  });
}

async function handleClearFlowDraft() {
  try {
    await ElMessageBox.confirm('清空后无法恢复，确定继续吗？', '清空 Flow 草稿', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
      autofocus: false,
    });
  } catch {
    return;
  }

  try {
    await flowDraftAutosave.clearDraft();
    flowDraft.value = '';
    flowDraftDocument.value = normalizeFlowDraftDocument(null);
    Msg.showSuccess('Flow 草稿已清空');
  } catch {
    Msg.showFail(flowDraftAutosave.errorMessage.value || 'Flow 草稿清空失败');
  }
}

onMounted(async () => {
  const restoredDraft = await flowDraftAutosave.initialize();
  if (restoredDraft) {
    flowDraftDocument.value = restoredDraft.content;
  }
});
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
    position: relative;
    isolation: isolate;
    container-type: inline-size;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      border-inline: 1px solid color-mix(in oklch, var(--fontColor) 8%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 72px, #000 calc(100% - 72px), transparent 100%);
      mask-image: linear-gradient(to bottom, transparent 0, #000 72px, #000 calc(100% - 72px), transparent 100%);
    }
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

html.dark .flow-page .flow-column::before {
  border-color: color-mix(in oklch, var(--fontColor) 10%, transparent);
}
</style>
