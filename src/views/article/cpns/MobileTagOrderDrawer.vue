<script lang="ts" setup>
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/vue';
import { isSortable } from '@dnd-kit/vue/sortable';
import { LockKeyhole } from '@lucide/vue';

import SortableTagItem from './SortableTagItem.vue';

import type { Itag } from '@/stores/types/article.result';

defineProps<{
  tags: Itag[];
  isSaving: boolean;
}>();

const isOpen = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number];
}>();

const handleDragEnd = (event: DragEndEvent) => {
  if (event.canceled) return;
  const source = event.operation.source;
  if (!isSortable(source) || source.initialIndex === source.index) return;
  emit('reorder', source.initialIndex, source.index);
};
</script>

<template>
  <el-drawer v-model="isOpen" direction="btt" size="min(74vh, 640px)" :with-header="false" append-to-body class="mobile-tag-order-drawer">
    <div class="drawer-shell">
      <header class="drawer-header">
        <div>
          <p class="drawer-kicker">YOUR READING INDEX</p>
          <h2 class="drawer-title">调整标签顺序</h2>
        </div>
        <button type="button" class="done-button" @click="isOpen = false">完成</button>
      </header>

      <p class="drawer-hint">按住右侧手柄上下拖动，新的顺序会自动保存。</p>

      <div class="fixed-overview" data-test="fixed-overview">
        <span>综合</span>
        <span class="fixed-label"><LockKeyhole :size="13" aria-hidden="true" />固定</span>
      </div>

      <div class="sortable-list" :aria-busy="isSaving">
        <DragDropProvider @dragEnd="handleDragEnd">
          <SortableTagItem
            v-for="(tag, index) in tags"
            :key="tag.id"
            :tag="tag"
            :index="index"
            :active="false"
            direction="vertical"
            :disabled="isSaving"
            drag-mode="handle"
            :selectable="false"
          />
        </DragDropProvider>
      </div>

      <p class="saving-status" aria-live="polite">{{ isSaving ? '正在保存顺序…' : '拖动后自动保存' }}</p>
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
:deep(.mobile-tag-order-drawer) {
  overflow: hidden;
  background: color-mix(in srgb, var(--el-bg-color) 94%, #81c995 6%);
  border-top: 1px solid color-mix(in srgb, #81c995 48%, var(--border-color-list));
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -14px 42px rgba(33, 48, 40, 0.16);
}

:deep(.mobile-tag-order-drawer .el-drawer__body) {
  padding: 0;
}

.drawer-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 18px max(14px, env(safe-area-inset-bottom));
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 3px 2px 12px;
}

.drawer-kicker {
  margin: 0 0 3px;
  color: color-mix(in srgb, #81c995 76%, var(--fontColor));
  font-family: monospace;
  font-size: 10px;
  letter-spacing: 0.13em;
}

.drawer-title {
  margin: 0;
  color: var(--fontColor);
  font-size: 20px;
  line-height: 1.25;
}

.done-button {
  min-width: 52px;
  min-height: 36px;
  padding: 0 12px;
  color: color-mix(in srgb, #81c995 58%, var(--fontColor));
  font: inherit;
  font-weight: 650;
  background: color-mix(in srgb, #81c995 13%, transparent);
  border: 1px solid color-mix(in srgb, #81c995 46%, transparent);
  border-radius: 7px;
  cursor: pointer;
}

.drawer-hint {
  margin: 0 2px 14px;
  color: var(--fontColor2);
  font-size: 13px;
  line-height: 1.5;
}

.fixed-overview,
.sortable-list :deep(.sortable-tag-item) {
  min-height: 46px;
  background: color-mix(in srgb, var(--el-bg-color) 86%, transparent);
  border-bottom-color: color-mix(in srgb, var(--border-color-list) 76%, transparent);
}

.fixed-overview {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 18px;
  color: var(--fontColor2);
  border: 1px solid color-mix(in srgb, var(--border-color-list) 76%, transparent);
  border-radius: 8px 8px 0 0;
}

.fixed-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}

.sortable-list {
  min-height: 0;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--border-color-list) 76%, transparent);
  border-top: 0;
  border-radius: 0 0 8px 8px;
}

.sortable-list :deep(.sortable-tag-item) {
  padding-left: 18px;
  border-width: 0 0 1px;

  &:last-child {
    border-bottom: 0;
  }
}

.saving-status {
  min-height: 18px;
  margin: 9px 2px 0;
  color: var(--fontColor2);
  font-size: 12px;
  text-align: right;
}

@media (max-width: 800px) {
  .done-button,
  .fixed-overview,
  .sortable-list :deep(.sortable-tag-item) {
    min-height: 3.84rem;
  }
}
</style>
