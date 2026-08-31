<template>
  <div class="flow-page" ref="containerRef">
    <FlowCordWidget
      ref="cordRef"
      :model-value="editorOpen"
      controls-id="flow-editor-panel"
      :disabled="composerClearing || composerSaving || composerDiscarding || modalPublishing || publicationResetting || composerRestoring"
      @update:model-value="handleCordToggle"
    />
    <FlowEditorModal
      :key="composerGeneration"
      ref="flowEditorModalRef"
      :open="editorOpen"
      :content="flowDraft"
      :document="flowDraftDocument"
      :draft-status="flowDraftAutosave.status.value"
      :draft-status-text="flowDraftAutosave.statusText.value"
      :draft-error="flowDraftAutosave.errorMessage.value"
      :has-draft="flowDraftAutosave.hasDraft.value"
      :restored-images="flowDraftImages"
      :clear-disabled="composerClearing || composerSaving || composerDiscarding || modalPublishing || composerRestoring || draftRecoveryBlocked || !imagesComplete || flowDraftAutosave.isSaving.value || flowDraftAutosave.isClearing.value || flowDraftAutosave.isHydrating.value"
      :editor-disabled="composerClearing || composerSaving || composerDiscarding || flowDraftAutosave.isClearing.value"
      :publish-disabled="composerSaving || composerDiscarding || composerRestoring || draftRecoveryBlocked || !imagesComplete || flowDraftAutosave.isHydrating.value"
      :lifecycle-locked="publicationResetting || composerRestoring || composerDiscarding"
      :can-save-draft="flowDraftAutosave.canSave.value && !draftRecoveryBlocked && imagesComplete && !composerSaving && !composerDiscarding"
      :saving-draft="flowDraftAutosave.isSaving.value || composerSaving"
      :saved-media-ids="flowDraftAutosave.savedMediaIds.value"
      controls-id="flow-editor-panel"
      @close="handleEditorClose"
      @update:content="handleFlowContentUpdate"
      @update:json="handleFlowDocumentUpdate"
      @update:image-assets="handleFlowImageAssetsUpdate"
      @update:media-ids="handleFlowMediaIdsUpdate"
      @update:publishing="handleModalPublishing"
      @clear-draft="handleClearFlowDraft"
      @save-draft="handleSaveFlowDraft"
      @published="handlePublished"
      @after-close="handleAfterClose"
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
import { flowKeys } from '@/composables/useFlowFeed';
import { usePullToRefresh } from '@/composables/usePullToRefresh';
import { useQueryClient } from '@tanstack/vue-query';
import useUserStore from '@/stores/user.store';
import { LocalCache, Msg } from '@/utils';
import { ElMessageBox } from 'element-plus';
import { Loader2 } from '@lucide/vue';

import type { TiptapDocContent } from '@/service/draft/draft.types';
import type { FlowDraftRestoreState } from '@/service/flow/flow-draft.types';
import type { FlowImageAsset } from '@/service/flow/flow.types';

const containerRef = ref<HTMLElement | null>(null);
const feedRef = ref<InstanceType<typeof FlowFeed> | null>(null);
const cordRef = ref<InstanceType<typeof FlowCordWidget> | null>(null);
const flowEditorModalRef = ref<InstanceType<typeof FlowEditorModal> | null>(null);

const editorOpen = shallowRef(false);
const flowDraft = shallowRef('');
const flowDraftDocument = shallowRef<TiptapDocContent>();
const flowDraftMediaIds = shallowRef<number[]>([]);
const flowDraftImages = shallowRef<FlowImageAsset[]>([]);
const restoredImageIds = shallowRef<number[]>([]);
const unresolvedImageIds = shallowRef<number[]>([]);
const imagesComplete = shallowRef(true);
const composerGeneration = shallowRef(0);
const composerClearing = shallowRef(false);
const composerSaving = shallowRef(false);
const composerDiscarding = shallowRef(false);
const closeConfirming = shallowRef(false);
const modalPublishing = shallowRef(false);
const publicationResetting = shallowRef(false);
const composerRestoring = shallowRef(true);
const draftRecoveryBlocked = shallowRef(false);
const queryClient = useQueryClient();
let publicationResetPending = false;
let discardResetPending = false;

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

function recordCurrentFlowSnapshot() {
  flowDraftAutosave.recordSnapshot({
    content: normalizeFlowDraftDocument(flowDraftDocument.value),
    meta: {
      imageIds: [...flowDraftMediaIds.value],
      videoIds: [],
    },
  }, flowDraftImages.value);
}

function updateImagesCompleteness(mediaIds: readonly number[], images: readonly FlowImageAsset[] = flowDraftImages.value): void {
  const imageIds = new Set(images.map((image) => image.id));
  imagesComplete.value = unresolvedImageIds.value.length === 0 && mediaIds.every((mediaId) => imageIds.has(mediaId));
}

function mergeMediaIdsPreservingUnresolved(mediaIds: readonly number[]): number[] {
  if (unresolvedImageIds.value.length === 0) return [...mediaIds];

  const unresolved = new Set(unresolvedImageIds.value);
  const nextIds: number[] = [];
  const queueIds = mediaIds.filter((mediaId) => !unresolved.has(mediaId));
  const previousIds = flowDraftMediaIds.value;
  let queueIndex = 0;

  for (const previousId of previousIds) {
    if (unresolved.has(previousId)) {
      nextIds.push(previousId);
      continue;
    }
    const nextId = queueIds[queueIndex++];
    if (nextId !== undefined) nextIds.push(nextId);
  }

  nextIds.push(...queueIds.slice(queueIndex));
  return nextIds;
}

function handleModalPublishing(publishing: boolean) {
  modalPublishing.value = publishing;
}

function handleCordToggle(open: boolean) {
  if (open) {
    if (composerClearing.value || composerSaving.value || composerDiscarding.value || publicationResetting.value) return;
    editorOpen.value = true;
    return;
  }
  void handleEditorClose();
}

async function handleSaveFlowDraft(options: { closeAfterSave?: boolean } = {}): Promise<boolean> {
  if (
    composerClearing.value ||
    composerSaving.value ||
    composerDiscarding.value ||
    composerRestoring.value ||
    modalPublishing.value ||
    publicationResetting.value ||
    publicationResetPending
  ) {
    return false;
  }

  if (draftRecoveryBlocked.value) {
    Msg.showFail('Flow 草稿恢复失败，暂时无法保存');
    return false;
  }
  if (!imagesComplete.value) {
    Msg.showFail('部分图片尚未恢复，暂时无法保存 Flow 草稿');
    return false;
  }

  if (!flowDraftAutosave.canSave.value) {
    Msg.showFail(flowDraftAutosave.errorMessage.value || '当前 Flow 草稿无法保存');
    return false;
  }

  const previousSavedIds = [...flowDraftAutosave.savedMediaIds.value];
  const currentMediaIds = new Set(flowDraftMediaIds.value);
  const removedSavedIds = previousSavedIds.filter((mediaId) => !currentMediaIds.has(mediaId));
  composerSaving.value = true;

  try {
    await flowDraftAutosave.saveDraft();
    if (removedSavedIds.length > 0) {
      const { failedDeletes } = (await flowEditorModalRef.value?.cleanupMediaIds(removedSavedIds)) ?? { failedDeletes: 0 };
      if (failedDeletes > 0) {
        Msg.showWarn('Flow 草稿已保存，部分移除图片将由服务端稍后自动回收');
      }
    }
    if (options.closeAfterSave) editorOpen.value = false;
    return true;
  } catch {
    Msg.showFail(flowDraftAutosave.errorMessage.value || 'Flow 草稿保存失败');
    return false;
  } finally {
    composerSaving.value = false;
  }
}

async function discardFlowChanges(): Promise<void> {
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value) return;
  composerDiscarding.value = true;
  const retainedMediaIds = [...flowDraftAutosave.savedMediaIds.value];
  try {
    const { failedDeletes } = (await flowEditorModalRef.value?.discardAttachments(retainedMediaIds)) ?? { failedDeletes: 0 };
    if (failedDeletes > 0) {
      Msg.showWarn('已放弃 Flow 修改，部分新增图片将由服务端稍后自动回收');
    }
  } catch {
    Msg.showWarn('已放弃 Flow 修改，新增图片将由服务端稍后自动回收');
  }
  discardResetPending = true;
  editorOpen.value = false;
}

async function handleEditorClose() {
  if (publicationResetPending) {
    editorOpen.value = false;
    return;
  }
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || closeConfirming.value) return;
  if (!flowDraftAutosave.isDirty.value) {
    editorOpen.value = false;
    return;
  }
  if (!flowDraftAutosave.hasContent.value) {
    await discardFlowChanges();
    return;
  }

  closeConfirming.value = true;
  let choice: 'save' | 'discard' | 'cancel' = 'cancel';
  try {
    await ElMessageBox.confirm('当前 Flow 有尚未保存的内容。', '退出 Flow 编辑？', {
      confirmButtonText: '保存草稿',
      cancelButtonText: '放弃',
      distinguishCancelAndClose: true,
      closeOnClickModal: false,
      autofocus: false,
      type: 'warning',
    });
    choice = 'save';
  } catch (action) {
    if (action === 'cancel') choice = 'discard';
  } finally {
    closeConfirming.value = false;
  }

  if (choice === 'save') {
    await handleSaveFlowDraft({ closeAfterSave: true });
  } else if (choice === 'discard') {
    await discardFlowChanges();
  }
}

function handleFlowContentUpdate(content: string) {
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || publicationResetPending) return;
  flowDraft.value = content;
}

function handleFlowDocumentUpdate(document: TiptapDocContent) {
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || publicationResetPending) return;
  // Tiptap emits JSON while applying restored content.
  const normalizedDocument = normalizeFlowDraftDocument(document);
  flowDraftDocument.value = normalizedDocument;
  recordCurrentFlowSnapshot();
}

function handleFlowImageAssetsUpdate(images: FlowImageAsset[]) {
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || publicationResetPending) return;
  const previousImageIds = new Set(flowDraftImages.value.map((image) => image.id));
  const nextImageIds = new Set(images.map((image) => image.id));
  const remainingUnresolved = new Set(unresolvedImageIds.value);
  for (const imageId of nextImageIds) {
    if (remainingUnresolved.has(imageId)) {
      remainingUnresolved.delete(imageId);
      continue;
    }
    if (!previousImageIds.has(imageId) && !restoredImageIds.value.includes(imageId) && remainingUnresolved.size > 0) {
      remainingUnresolved.delete(remainingUnresolved.values().next().value!);
    }
  }
  flowDraftImages.value = [...images];
  unresolvedImageIds.value = [...remainingUnresolved];
  updateImagesCompleteness(flowDraftMediaIds.value, flowDraftImages.value);
}

function handleFlowMediaIdsUpdate(mediaIds: number[]) {
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || publicationResetPending) return;
  flowDraftMediaIds.value = mergeMediaIdsPreservingUnresolved(mediaIds);
  updateImagesCompleteness(flowDraftMediaIds.value);
  recordCurrentFlowSnapshot();
}

function resetComposerState() {
  flowDraft.value = '';
  flowDraftDocument.value = normalizeFlowDraftDocument(null);
  flowDraftMediaIds.value = [];
  flowDraftImages.value = [];
  restoredImageIds.value = [];
  unresolvedImageIds.value = [];
  imagesComplete.value = true;
  draftRecoveryBlocked.value = false;
  composerGeneration.value += 1;
}

function applyRestoredComposerState(restoredState: FlowDraftRestoreState | null) {
  if (!restoredState) {
    resetComposerState();
    return;
  }

  flowDraft.value = '';
  flowDraftDocument.value = restoredState.content;
  flowDraftMediaIds.value = [...restoredState.meta.imageIds];
  flowDraftImages.value = [...restoredState.images];
  restoredImageIds.value = [...restoredState.meta.imageIds];
  const availableImageIds = new Set(restoredState.images.map((image) => image.id));
  unresolvedImageIds.value = restoredState.meta.imageIds.filter((imageId) => !availableImageIds.has(imageId));
  imagesComplete.value = restoredState.imagesComplete;
  draftRecoveryBlocked.value = false;
  composerGeneration.value += 1;
}

function handlePublished() {
  publicationResetPending = true;
  publicationResetting.value = true;
  void queryClient.invalidateQueries({ queryKey: flowKeys.feed() });
}

async function handleAfterClose() {
  if (!publicationResetPending && !discardResetPending) {
    restoreCordFocus();
    return;
  }

  if (discardResetPending) {
    discardResetPending = false;
    const savedBaseline = flowDraftAutosave.restoreSavedBaseline();
    applyRestoredComposerState(savedBaseline);
    composerDiscarding.value = false;
    await nextTick();
    restoreCordFocus();
    return;
  }

  publicationResetPending = false;
  const result = await flowDraftAutosave.resetAfterPublication();
  resetComposerState();
  publicationResetting.value = false;
  await nextTick();
  restoreCordFocus();
  if (!result.remoteCleared) {
    Msg.showWarn('Flow 已发布，本地草稿已清空；远端旧草稿稍后会自动清理');
  }
}

async function handleClearFlowDraft() {
  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || publicationResetPending || draftRecoveryBlocked.value || !imagesComplete.value) return;
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

  if (composerClearing.value || composerSaving.value || composerDiscarding.value || composerRestoring.value || modalPublishing.value || publicationResetting.value || publicationResetPending || draftRecoveryBlocked.value || !imagesComplete.value) return;

  composerClearing.value = true;
  try {
    await flowDraftAutosave.clearDraft();
    const { failedDeletes } = (await flowEditorModalRef.value?.clearAttachments()) ?? { failedDeletes: 0 };
    resetComposerState();
    if (failedDeletes > 0) {
      Msg.showWarn('Flow 草稿已清空，部分图片未能立即删除，将由服务端自动回收');
    } else {
      Msg.showSuccess('Flow 草稿已清空');
    }
  } catch {
    Msg.showFail(flowDraftAutosave.errorMessage.value || 'Flow 草稿清空失败');
  } finally {
    composerClearing.value = false;
  }
}

onMounted(async () => {
  draftRecoveryBlocked.value = false;
  try {
    const restoredDraft = await flowDraftAutosave.initialize();
    if (restoredDraft) {
      flowDraftMediaIds.value = [...restoredDraft.meta.imageIds];
      flowDraftImages.value = [...restoredDraft.images];
      restoredImageIds.value = [...restoredDraft.meta.imageIds];
      const availableImageIds = new Set(restoredDraft.images.map((image) => image.id));
      unresolvedImageIds.value = restoredDraft.meta.imageIds.filter((imageId) => !availableImageIds.has(imageId));
      imagesComplete.value = restoredDraft.imagesComplete;
      flowDraftDocument.value = restoredDraft.content;
    } else if (flowDraftAutosave.status.value === 'error' || flowDraftAutosave.status.value === 'conflict') {
      draftRecoveryBlocked.value = true;
    }
    await nextTick();
  } catch {
    draftRecoveryBlocked.value = true;
  } finally {
    composerRestoring.value = false;
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
