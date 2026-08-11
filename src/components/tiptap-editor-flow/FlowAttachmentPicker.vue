<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { ImagePlus } from '@lucide/vue';

const props = defineProps<{
  retainedCount: number;
}>();

const emit = defineEmits<{
  files: [files: File[]];
}>();

const inputRef = useTemplateRef<HTMLInputElement>('imageInput');

const isFull = computed(() => props.retainedCount >= 9);

function emitCandidates(files: ArrayLike<File>): void {
  const candidates = Array.from(files);
  if (candidates.length > 0) emit('files', candidates);
}

function openFileInput(): void {
  if (!isFull.value) inputRef.value?.click();
}

function handleInputChange(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  if (!isFull.value && input.files) emitCandidates(input.files);
  input.value = '';
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault();
}

function handleDrop(event: DragEvent): void {
  event.preventDefault();
  if (!isFull.value && event.dataTransfer?.files) emitCandidates(event.dataTransfer.files);
}

function handlePaste(event: ClipboardEvent): void {
  const files = Array.from(event.clipboardData?.items ?? []).flatMap((item) => {
    if (item.kind !== 'file') return [];
    const file = item.getAsFile();
    return file ? [file] : [];
  });

  if (!isFull.value && files.length > 0) emit('files', files);
}
</script>

<template>
  <div class="flow-attachment-picker" role="region" tabindex="0" aria-label="图片添加区域" @dragover="handleDragOver" @drop="handleDrop" @paste="handlePaste">
    <input
      ref="imageInput"
      class="flow-attachment-picker__input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      :disabled="isFull"
      tabindex="-1"
      aria-hidden="true"
      @change="handleInputChange"
    />
    <button class="flow-attachment-picker__button" type="button" aria-label="添加图片，最多 9 张" :disabled="isFull" @click="openFileInput">
      <ImagePlus :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.flow-attachment-picker {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.flow-attachment-picker__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.flow-attachment-picker__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--text-primary, var(--el-text-color-primary));
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: color-mix(in oklch, var(--fontColor) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}
</style>
