<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';

import type { FlowDraftAutosaveStatus } from '@/composables/useFlowDraftAutosave';
import type { TiptapDocContent } from '@/service/draft/draft.types';

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
  },
);

const emit = defineEmits<{
  close: [];
  'update:content': [html: string];
  'update:document': [document: TiptapDocContent];
  'clear-draft': [];
  'after-close': [];
}>();

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
        <button ref="closeButtonRef" type="button" class="flow-editor-modal__close" aria-label="关闭 Flow 编辑器" title="关闭（Esc）" @click="requestClose">
          <X :size="17" aria-hidden="true" />
        </button>

        <div class="flow-editor-modal__input">
          <TiptapEditorFlow
            :edit-content="content"
            :edit-document="document"
            :disabled="editorDisabled"
            @update:content="emit('update:content', $event)"
            @update:document="emit('update:document', $event)"
          />
          <div class="flow-editor-modal__footer">
            <div class="flow-editor-modal__draft-meta">
              <button
                v-if="hasDraft"
                type="button"
                class="flow-editor-modal__clear"
                :disabled="clearDisabled"
                aria-label="清空 Flow 草稿"
                title="清空 Flow 草稿"
                @click="emit('clear-draft')"
              >
                <Trash2 :size="13" aria-hidden="true" />
                <span>清空草稿</span>
              </button>
              <span role="status" aria-live="polite" class="flow-editor-modal__status" :data-status="draftStatus" :title="draftError || draftStatusText">
                {{ draftStatusText }}
              </span>
            </div>
            <div class="flow-editor-modal__publish">
              <el-button type="primary" plain disabled>发布</el-button>
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
  position: absolute;
  left: 12px;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.flow-editor-modal__draft-meta,
.flow-editor-modal__publish {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  pointer-events: auto;
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
  padding-bottom: 50px;
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
