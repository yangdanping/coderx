<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import { GripVertical } from '@lucide/vue';
import { useSortable } from '@dnd-kit/vue/sortable';

import type { Itag } from '@/stores/types/article.result';

export type TagDragMode = 'none' | 'item' | 'handle';

const props = defineProps<{
  tag: Itag;
  index: number;
  active: boolean;
  direction: 'horizontal' | 'vertical';
  disabled: boolean;
  dragMode?: TagDragMode;
  entryAnimating?: boolean;
  selectable?: boolean;
}>();

const emit = defineEmits<{
  select: [tagId: number];
}>();

const itemElement = useTemplateRef<HTMLElement>('itemElement');
const dragHandle = useTemplateRef<HTMLButtonElement>('dragHandle');
const effectiveDragMode = computed(() => props.dragMode ?? 'none');
const sortableHandle = computed(() => (effectiveDragMode.value === 'item' ? itemElement.value : dragHandle.value));

const { isDragging } = useSortable({
  id: () => props.tag.id ?? `tag-${props.index}`,
  index: () => props.index,
  element: itemElement,
  handle: sortableHandle,
  disabled: () => props.disabled || effectiveDragMode.value === 'none',
});

const selectTag = () => {
  if (props.selectable === false) return;
  if (props.tag.id != null) emit('select', props.tag.id);
};
</script>

<template>
  <div
    ref="itemElement"
    class="sortable-tag-item"
    :class="[
      direction,
      {
        'is-active': active,
        'is-dragging': isDragging,
        'is-whole-row-drag': effectiveDragMode === 'item',
        'is-entry-animating': entryAnimating,
      },
    ]"
    :data-tag-id="tag.id"
  >
    <button type="button" class="tag-select" :aria-disabled="selectable === false" @click="selectTag">{{ tag.name }}</button>
    <button v-if="effectiveDragMode === 'handle'" ref="dragHandle" type="button" class="drag-handle" :disabled="disabled" :aria-label="`调整“${tag.name ?? ''}”的顺序`">
      <GripVertical :size="16" aria-hidden="true" />
    </button>
    <span v-if="active && direction === 'horizontal'" class="active-bar" aria-hidden="true"></span>
  </div>
</template>

<style lang="scss" scoped>
.sortable-tag-item {
  position: relative;
  display: flex;
  align-items: center;
  color: var(--fontColor);
  font-size: 1em;
  line-height: normal;
  border: 1px solid transparent;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    opacity 180ms ease,
    box-shadow 180ms ease;

  &.vertical {
    justify-content: flex-start;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    padding: 6px 14px;

    &.is-active:not(.is-whole-row-drag) {
      color: var(--el-color-primary);
      font-weight: 600;
      background: rgba(64, 158, 255, 0.05);
      border-color: rgba(64, 158, 255, 0.2);
    }

    .tag-select {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }
  }

  &.horizontal {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 0 10px;

    &.is-active {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }

  &:hover {
    color: var(--el-color-primary);
  }

  &.is-whole-row-drag {
    cursor: grab;
    background: color-mix(in srgb, var(--el-color-primary) 4%, transparent);
    border-color: color-mix(in srgb, var(--el-color-primary) 14%, transparent);

    .tag-select {
      pointer-events: none;
    }

    &:active {
      cursor: grabbing;
    }
  }

  &.is-dragging {
    z-index: var(--z-sticky);
    cursor: grabbing;
    opacity: 0.78;
    box-shadow: 0 6px 18px rgba(42, 55, 48, 0.12);
  }

  &.is-entry-animating .tag-select {
    animation: tag-edit-nudge 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

.tag-select,
.drag-handle {
  color: inherit;
  font: inherit;
  line-height: inherit;
  background: transparent;
  border: 0;
}

.tag-select {
  min-width: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.sortable-tag-item.horizontal .tag-select {
  min-height: 44px;
  padding: 7px 4px;
}

.drag-handle {
  display: inline-grid;
  flex: 0 0 36px;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-left: auto;
  padding: 0;
  color: color-mix(in srgb, var(--fontColor) 60%, transparent);
  cursor: grab;
  touch-action: none;
  border-radius: 6px;

  &:focus-visible {
    color: var(--el-color-primary);
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }

  &:active {
    cursor: grabbing;
  }
}

.active-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 20px;
  height: 2px;
  background-color: var(--el-color-primary);
  border-radius: 1px;
  transform: translateX(-50%);
}

@keyframes tag-edit-nudge {
  0%,
  100% {
    transform: translateX(0);
  }

  28% {
    transform: translateX(2px);
  }

  58% {
    transform: translateX(-1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sortable-tag-item.is-entry-animating .tag-select {
    animation: none;
  }
}

@media (max-width: 800px) {
  .sortable-tag-item.horizontal,
  .sortable-tag-item.horizontal .tag-select {
    min-height: 3.67rem;
  }

  .drag-handle {
    flex-basis: 3.67rem;
    width: 3.67rem;
    height: 3.67rem;
  }
}
</style>
