<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import FlowAttachmentGrid from '@/components/tiptap-editor-flow/FlowAttachmentGrid.vue';
import TiptapEditorFlow from '@/components/tiptap-editor-flow/TiptapEditorFlow.vue';
import { useFlowImageUploads } from '@/composables/useFlowImageUploads';
import { createFlow } from '@/service/flow/flow.request';

import type { FlowDraftAutosaveStatus } from '@/composables/useFlowDraftAutosave';
import type { TiptapDocContent } from '@/service/draft/draft.types';
import type { CreateFlowPayload } from '@/service/flow/flow.types';

const props = withDefaults(
  defineProps<{
    open: boolean;
    content?: string;
    document?: TiptapDocContent;
    controlsId?: string;
    draftStatus?: FlowDraftAutosaveStatus;
    draftStatusText?: string;
    draftError?: string;
    hasDraft?: boolean;
    clearDisabled?: boolean;
    editorDisabled?: boolean;
    publishDisabled?: boolean;
    lifecycleLocked?: boolean;
  }>(),
  {
    content: '',
    controlsId: 'flow-editor-panel',
    draftStatus: 'idle',
    draftStatusText: '',
    draftError: '',
    hasDraft: false,
    clearDisabled: false,
    editorDisabled: false,
    publishDisabled: false,
    lifecycleLocked: false,
  },
);

const emit = defineEmits<{
  close: [];
  'update:content': [html: string];
  'update:document': [document: TiptapDocContent];
  'update:json': [document: TiptapDocContent];
  'update:media-ids': [mediaIds: number[]];
  'update:publishing': [publishing: boolean];
  'clear-draft': [];
  published: [];
  'after-close': [];
}>();

const uploads = useFlowImageUploads();
const publishing = shallowRef(false);
const queueError = shallowRef('');
const clientRequestId = shallowRef(crypto.randomUUID());
const interactionLocked = computed(() => props.editorDisabled || publishing.value || props.lifecycleLocked);
let retryPayload: CreateFlowPayload | null = null;
let retryContent = '';

const normalizedDocument = computed<TiptapDocContent>(() => props.document ?? { type: 'doc', content: [{ type: 'paragraph' }] });

function collectPlainText(node: TiptapDocContent | undefined): string {
  if (!node) return '';
  const ownText = typeof node.text === 'string' ? node.text : '';
  return ownText + (node.content?.map((child) => collectPlainText(child)).join('') ?? '');
}

const canPublish = computed(
  () =>
    !interactionLocked.value &&
    !props.publishDisabled &&
    !uploads.isUploading.value &&
    !uploads.hasFailed.value &&
    (collectPlainText(normalizedDocument.value).trim().length > 0 || uploads.uploadedMediaIds.value.length > 0),
);

function abandonRetryIdentity(): void {
  if (!retryPayload) return;
  retryPayload = null;
  retryContent = '';
  clientRequestId.value = crypto.randomUUID();
}

function markContentMutation(content: string): void {
  if (retryPayload && content !== retryContent) abandonRetryIdentity();
}

function markDocumentMutation(document: TiptapDocContent): void {
  if (retryPayload && JSON.stringify(document) !== JSON.stringify(retryPayload.content)) abandonRetryIdentity();
}

watch(uploads.uploadedMediaIds, (mediaIds) => {
  if (interactionLocked.value) return;
  emit('update:media-ids', [...mediaIds]);
});

function addCandidateFiles(files: File[]): void {
  if (interactionLocked.value) return;
  queueError.value = '';
  const result = uploads.addFiles(files);
  if (result.accepted.length > 0) abandonRetryIdentity();
  if (result.rejected.length > 0) {
    queueError.value = result.rejected[0]?.message ?? '部分图片未能添加';
  }
}

function retryAttachment(clientId: string): void {
  if (interactionLocked.value) return;
  queueError.value = '';
  if (uploads.retry(clientId)) abandonRetryIdentity();
}

async function removeAttachment(clientId: string): Promise<void> {
  if (interactionLocked.value) return;
  queueError.value = '';
  if (await uploads.remove(clientId)) {
    abandonRetryIdentity();
  } else {
    queueError.value = '图片删除失败，请重试';
  }
}

function moveAttachment(from: number, to: number): void {
  if (interactionLocked.value) return;
  if (uploads.move(from, to)) abandonRetryIdentity();
}

function handleContentUpdate(html: string): void {
  if (interactionLocked.value) return;
  markContentMutation(html);
  emit('update:content', html);
}

function handleDocumentUpdate(document: TiptapDocContent): void {
  if (interactionLocked.value) return;
  markDocumentMutation(document);
  emit('update:document', document);
}

function handleJsonUpdate(document: TiptapDocContent): void {
  if (interactionLocked.value) return;
  markDocumentMutation(document);
  emit('update:json', document);
}

function requestClearDraft(): void {
  if (interactionLocked.value || props.clearDisabled) return;
  emit('clear-draft');
}

async function publish(): Promise<void> {
  if (!canPublish.value) return;

  if (!retryPayload) {
    retryPayload = {
      clientRequestId: clientRequestId.value,
      content: JSON.parse(JSON.stringify(normalizedDocument.value)) as TiptapDocContent,
      mediaIds: [...uploads.uploadedMediaIds.value],
    };
    retryContent = props.content;
  }
  const publicationPayload = retryPayload;
  publishing.value = true;
  emit('update:publishing', true);
  queueError.value = '';
  try {
    await createFlow(publicationPayload);
    uploads.dispose();
    emit('published');
    emit('close');
  } catch {
    queueError.value = '发布失败，请重试';
  } finally {
    publishing.value = false;
    emit('update:publishing', false);
  }
}

async function clearAttachments(): Promise<{ failedDeletes: number }> {
  if (publishing.value || props.lifecycleLocked) return { failedDeletes: 0 };
  const retainedClientIds = uploads.attachments.value.map((attachment) => attachment.clientId);
  const results = await Promise.all(retainedClientIds.map((clientId) => uploads.remove(clientId)));
  const failedDeletes = results.filter((removed) => !removed).length;
  uploads.dispose();
  return { failedDeletes };
}

defineExpose({ clearAttachments });

const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
const closeButtonRef = useTemplateRef<HTMLButtonElement>('closeButtonRef');
const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

let originalBodyOverflow = '';
let bodyScrollLocked = false;

function lockBodyScroll() {
  if (bodyScrollLocked) return;

  originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  bodyScrollLocked = true;
}

function restoreBodyScroll() {
  if (!bodyScrollLocked) return;

  document.body.style.overflow = originalBodyOverflow;
  bodyScrollLocked = false;
}

async function focusEditor() {
  await nextTick();
  requestAnimationFrame(() => {
    const editable = dialogRef.value?.querySelector<HTMLElement>('[contenteditable="true"]');
    (editable ?? closeButtonRef.value ?? dialogRef.value)?.focus();
  });
}

function requestClose() {
  if (interactionLocked.value) return;
  emit('close');
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (!props.open || event.isComposing || event.key !== 'Escape') return;

  event.preventDefault();
  requestClose();
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialogRef.value) return;

  const focusableElements = Array.from(dialogRef.value.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements.at(-1);
  if (!firstFocusable || !lastFocusable) {
    event.preventDefault();
    dialogRef.value.focus();
    return;
  }

  if (event.shiftKey && (document.activeElement === firstFocusable || !dialogRef.value.contains(document.activeElement))) {
    event.preventDefault();
    lastFocusable.focus();
    return;
  }

  if (!event.shiftKey && (document.activeElement === lastFocusable || !dialogRef.value.contains(document.activeElement))) {
    event.preventDefault();
    firstFocusable.focus();
  }
}

function handleAfterLeave() {
  restoreBodyScroll();
  emit('after-close');
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    lockBodyScroll();
    void focusEditor();
  },
  { immediate: true },
);

onMounted(() => window.addEventListener('keydown', handleWindowKeydown));

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown);
  restoreBodyScroll();
  uploads.dispose();
});
</script>

<template>
  <Transition name="flow-editor-modal" :duration="420" @after-leave="handleAfterLeave">
    <div v-show="open" class="flow-editor-modal">
      <section
        :id="controlsId"
        ref="dialogRef"
        class="flow-editor-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="发布 Flow"
        tabindex="-1"
        @keydown="handleDialogKeydown"
      >
        <button
          ref="closeButtonRef"
          type="button"
          class="flow-editor-modal__close"
          aria-label="关闭 Flow 编辑器"
          title="关闭（Esc）"
          :disabled="interactionLocked"
          @click="requestClose"
        >
          <X :size="17" aria-hidden="true" />
        </button>

        <div class="flow-editor-modal__input">
          <TiptapEditorFlow
            :edit-content="content"
            :edit-document="document"
            :disabled="interactionLocked"
            :retained-count="uploads.attachments.value.length"
            @update:content="handleContentUpdate"
            @update:document="handleDocumentUpdate"
            @update:json="handleJsonUpdate"
            @files="addCandidateFiles"
          />
          <div class="flow-editor-modal__attachments" :inert="interactionLocked ? '' : undefined" :aria-disabled="interactionLocked ? 'true' : undefined">
            <FlowAttachmentGrid :attachments="uploads.attachments.value" @retry="retryAttachment" @remove="removeAttachment" @move="moveAttachment" />
            <p v-if="queueError" class="flow-editor-modal__queue-error" role="alert">{{ queueError }}</p>
          </div>
          <div class="flow-editor-modal__footer">
            <div class="flow-editor-modal__draft-meta">
              <button
                v-if="hasDraft"
                type="button"
                class="flow-editor-modal__clear"
                :disabled="clearDisabled || interactionLocked"
                aria-label="清空 Flow 草稿"
                title="清空 Flow 草稿"
                @click="requestClearDraft"
              >
                <Trash2 :size="13" aria-hidden="true" />
                <span>清空草稿</span>
              </button>
              <span role="status" aria-live="polite" class="flow-editor-modal__status" :data-status="draftStatus" :title="draftError || draftStatusText">
                {{ draftStatusText }}
              </span>
            </div>
            <div class="flow-editor-modal__publish">
              <el-button type="primary" plain :disabled="!canPublish" :loading="publishing" @click="publish">{{ publishing ? '发布中…' : '发布' }}</el-button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.flow-editor-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: calc(var(--navbarHeight, 60px) + 16px) 16px 24px;
  overflow: hidden auto;
  background: color-mix(in srgb, var(--text-primary) 10%, rgba(14, 18, 26, 0.36));
  backdrop-filter: blur(2px) saturate(0.76);
  overscroll-behavior: contain;
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.flow-editor-modal__dialog {
  position: relative;
  width: min(var(--flow-column-width, 880px), calc(100vw - 32px));
  max-height: calc(100dvh - var(--navbarHeight, 60px) - 40px);
  border: 1px solid color-mix(in oklch, var(--fontColor) 12%, transparent);
  border-radius: 12px;
  outline: none;
  background: color-mix(in oklch, var(--bg-color-primary) 97%, var(--glass-bg-popup, var(--bg-color-primary)));
  box-shadow: 0 6px 8px rgba(10, 16, 24, 0.2);
  transform: translate3d(0, 0, 0);
  transform-origin: top center;
  transition:
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 180ms ease-out;

  &:focus-visible {
    box-shadow:
      0 6px 8px rgba(10, 16, 24, 0.2),
      0 0 0 2px color-mix(in oklch, var(--el-color-primary) 42%, transparent);
  }
}

.flow-editor-modal__close {
  position: absolute;
  top: 9px;
  right: 9px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: color-mix(in oklch, var(--fontColor) 48%, transparent);
  background: transparent;
  cursor: var(--cursorPointer, pointer);
  transition:
    color 160ms ease,
    background-color 160ms ease;

  &:hover {
    color: color-mix(in oklch, var(--fontColor) 78%, transparent);
    background: color-mix(in oklch, var(--fontColor) 8%, transparent);
  }

  &:focus-visible {
    color: var(--fontColor);
    outline: 2px solid color-mix(in oklch, var(--el-color-primary) 64%, transparent);
    outline-offset: 1px;
    background: color-mix(in oklch, var(--fontColor) 8%, transparent);
  }
}

.flow-editor-modal__input {
  position: relative;
  display: flex;
  flex-direction: column;
}

.flow-editor-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}

.flow-editor-modal__draft-meta,
.flow-editor-modal__publish {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.flow-editor-modal__attachments {
  padding: 0 12px;
}

.flow-editor-modal__queue-error {
  margin: 8px 0 0;
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 1.4;
}

.flow-editor-modal__clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 4px 5px;
  border: 0;
  border-radius: 5px;
  color: color-mix(in oklch, var(--fontColor) 44%, transparent);
  font-size: 12px;
  line-height: 1;
  background: transparent;
  cursor: var(--cursorPointer, pointer);
  transition:
    color 150ms ease,
    background-color 150ms ease;

  &:hover:not(:disabled) {
    color: color-mix(in oklch, var(--fontColor) 72%, transparent);
    background: color-mix(in oklch, var(--fontColor) 7%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in oklch, var(--el-color-primary) 54%, transparent);
    outline-offset: 1px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.42;
  }
}

.flow-editor-modal__status {
  overflow: hidden;
  max-width: min(32vw, 210px);
  color: color-mix(in oklch, var(--fontColor) 42%, transparent);
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;

  &[data-status='error'],
  &[data-status='conflict'] {
    color: color-mix(in oklch, var(--el-color-danger) 76%, var(--fontColor));
  }
}

:deep(.comment-toolbar) {
  padding-right: 44px;
}

:deep(.flow-editor-content) {
  padding-bottom: 18px;
}

.flow-editor-modal-enter-from,
.flow-editor-modal-leave-to {
  opacity: 0;
}

.flow-editor-modal-enter-from .flow-editor-modal__dialog,
.flow-editor-modal-leave-to .flow-editor-modal__dialog {
  opacity: 0.88;
  transform: translate3d(0, calc(-100% - var(--navbarHeight, 60px) - 24px), 0);
}

@media (max-width: 768px) {
  .flow-editor-modal {
    padding: calc(var(--navbarHeight, 60px) + 10px) 10px 16px;
    padding-right: 44px;
  }

  .flow-editor-modal__dialog {
    width: 100%;
    max-height: calc(100dvh - var(--navbarHeight, 60px) - 26px);
    border-radius: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-editor-modal,
  .flow-editor-modal__dialog {
    transition-duration: 1ms;
  }

  .flow-editor-modal-enter-from .flow-editor-modal__dialog,
  .flow-editor-modal-leave-to .flow-editor-modal__dialog {
    transform: none;
  }
}
</style>
