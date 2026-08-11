<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { ChevronLeft, ChevronRight, RotateCcw, X } from '@lucide/vue';
import VueEasyLightbox from 'vue-easy-lightbox';

import type { FlowImageAttachment } from '@/service/flow/flow.types';

const props = defineProps<{
  attachments: readonly FlowImageAttachment[];
}>();

const emit = defineEmits<{
  retry: [clientId: string];
  remove: [clientId: string];
  move: [from: number, to: number];
  preview: [index: number];
}>();

const previewVisible = shallowRef(false);
const previewInitialIndex = shallowRef(0);

const uploadedAttachments = computed(() => props.attachments.filter((attachment) => attachment.status === 'uploaded'));
const previewUrls = computed(() => uploadedAttachments.value.map((attachment) => attachment.url ?? attachment.previewUrl));
const uploadingCount = computed(() => props.attachments.filter((attachment) => attachment.status === 'queued' || attachment.status === 'uploading').length);
const failedCount = computed(() => props.attachments.filter((attachment) => attachment.status === 'failed').length);
const liveStatus = computed(() => {
  if (props.attachments.length === 0) return '';
  const parts: string[] = [];
  if (uploadingCount.value > 0) parts.push(`${uploadingCount.value} 张图片上传中`);
  if (failedCount.value > 0) parts.push(`${failedCount.value} 张图片上传失败`);
  return parts.length > 0 ? parts.join('，') : '图片附件已就绪';
});

function previousLabel(index: number): string {
  return `将第 ${index + 1} 张图片前移`;
}

function nextLabel(index: number): string {
  return `将第 ${index + 1} 张图片后移`;
}

function previewLabel(attachment: FlowImageAttachment, index: number): string {
  if (attachment.status === 'uploaded') return `预览第 ${index + 1} 张图片`;
  if (attachment.status === 'failed') return `第 ${index + 1} 张图片上传失败，无法预览`;
  return `第 ${index + 1} 张图片尚未上传，无法预览`;
}

function openPreview(index: number): void {
  const attachment = props.attachments[index];
  if (!attachment || attachment.status !== 'uploaded') return;

  const uploadedIndex = uploadedAttachments.value.indexOf(attachment);
  if (uploadedIndex < 0) return;

  previewInitialIndex.value = uploadedIndex;
  previewVisible.value = true;
  emit('preview', index);
}
</script>

<template>
  <p class="flow-attachment-grid__status" aria-live="polite">{{ liveStatus }}</p>

  <section v-if="attachments.length > 0" class="flow-attachment-grid" aria-label="已添加图片">
    <div class="flow-attachment-grid__tiles">
      <div v-for="(attachment, index) in attachments" :key="attachment.clientId" class="flow-attachment-tile" :class="`is-${attachment.status}`">
        <button
          class="flow-attachment-tile__preview"
          type="button"
          :aria-label="previewLabel(attachment, index)"
          :disabled="attachment.status !== 'uploaded'"
          @click="openPreview(index)"
        >
          <img class="flow-attachment-tile__image" :src="attachment.previewUrl" :alt="attachment.file.name" />

          <div v-if="attachment.status === 'queued' || attachment.status === 'uploading'" class="flow-attachment-tile__overlay" aria-hidden="true">
            <span>{{ attachment.status === 'uploading' ? `上传中 ${attachment.progress}%` : '等待上传' }}</span>
          </div>
          <div v-else-if="attachment.status === 'failed'" class="flow-attachment-tile__overlay flow-attachment-tile__overlay--failed">
            <span>{{ attachment.error || '图片上传失败，请重试' }}</span>
          </div>
        </button>

        <div class="flow-attachment-tile__controls">
          <button class="flow-attachment-tile__control" type="button" :aria-label="previousLabel(index)" :disabled="index === 0" @click.stop="emit('move', index, index - 1)">
            <ChevronLeft :size="16" aria-hidden="true" />
          </button>
          <button
            class="flow-attachment-tile__control"
            type="button"
            :aria-label="nextLabel(index)"
            :disabled="index + 1 === attachments.length"
            @click.stop="emit('move', index, index + 1)"
          >
            <ChevronRight :size="16" aria-hidden="true" />
          </button>
          <button
            v-if="attachment.status === 'failed'"
            class="flow-attachment-tile__control"
            type="button"
            :aria-label="`重试第 ${index + 1} 张图片`"
            @click.stop="emit('retry', attachment.clientId)"
          >
            <RotateCcw :size="15" aria-hidden="true" />
          </button>
          <button class="flow-attachment-tile__control" type="button" :aria-label="`删除第 ${index + 1} 张图片`" @click.stop="emit('remove', attachment.clientId)">
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <VueEasyLightbox :visible="previewVisible" :imgs="previewUrls" :index="previewInitialIndex" teleport="body" @hide="previewVisible = false" />
  </section>
</template>

<style lang="scss" scoped>
.flow-attachment-grid {
  margin-top: 12px;
}

.flow-attachment-grid__status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.flow-attachment-grid__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 8px;
}

.flow-attachment-tile {
  position: relative;
  min-width: 0;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--bg-color-secondary, var(--bg-color-primary));
  border: 1px solid color-mix(in oklch, var(--fontColor) 12%, transparent);
  border-radius: 10px;
}

.flow-attachment-tile__preview {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.flow-attachment-tile__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flow-attachment-tile__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: #fff;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
  background: color-mix(in srgb, #000 52%, transparent);
}

.flow-attachment-tile__overlay--failed {
  background: color-mix(in srgb, var(--el-color-danger) 68%, rgba(0, 0, 0, 0.48));
}

.flow-attachment-tile__controls {
  position: absolute;
  right: 4px;
  bottom: 4px;
  left: 4px;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.flow-attachment-tile__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #fff;
  background: color-mix(in srgb, #000 54%, transparent);
  border: 0;
  border-radius: 8px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, #000 72%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-3);
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-attachment-tile,
  .flow-attachment-tile__control {
    transition: none;
  }
}
</style>
