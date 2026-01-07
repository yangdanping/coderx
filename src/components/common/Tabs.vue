<template>
  <div
    class="custom-tabs"
    :class="[direction, { 'hide-scrollbar': !isScrollbarVisible }]"
    ref="tabsRef"
    @scroll="handleScroll"
    @mouseenter="showScrollbar"
    @mouseleave="startHideTimer"
    @touchstart="showScrollbar"
    @touchend="startHideTimer"
  >
    <div class="tabs-content" ref="contentRef">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, provide, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: string | number;
  direction?: string;
}>();

const emit = defineEmits(['update:modelValue', 'tab-click']);

// Provide active state to children
provide('tabsContext', {
  activeValue: computed(() => props.modelValue),
  handleTabClick: (name: string | number) => {
    emit('update:modelValue', name);
    emit('tab-click', name);
  },
  direction: computed(() => props.direction),
});

// Scrollbar logic
const isScrollbarVisible = ref(false);
const tabsRef = ref<HTMLElement | null>(null);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const showScrollbar = () => {
  isScrollbarVisible.value = true;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const startHideTimer = () => {
  if (props.direction !== 'horizontal') return; // Only hide for horizontal usually, or both? Requirement said "horizontal mode... scrollbar hidden after 2s"

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    isScrollbarVisible.value = false;
  }, 2000);
};

const handleScroll = () => {
  showScrollbar();
  startHideTimer();
};

// Clean up
onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer);
});

// Initial check
onMounted(() => {
  if (props.direction === 'horizontal') {
    startHideTimer();
  } else {
    isScrollbarVisible.value = true; // Always show or let native handle it for vertical? usually vertical is fine.
  }
});

// Watch direction change
watch(
  () => props.direction,
  (newVal) => {
    if (newVal === 'horizontal') {
      startHideTimer();
    } else {
      isScrollbarVisible.value = true;
      if (hideTimer) clearTimeout(hideTimer);
    }
  },
);
</script>

<style lang="scss" scoped>
.custom-tabs {
  position: relative;
  overflow: auto;

  /* Hide scrollbar by default for clean look, show via class */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 3px;
  }

  /* Show scrollbar state */
  &:not(.hide-scrollbar) {
    scrollbar-color: rgba(144, 147, 153, 0.3) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: rgba(144, 147, 153, 0.3);
    }

    &:hover::-webkit-scrollbar-thumb {
      background-color: rgba(144, 147, 153, 0.5);
    }
  }

  &.vertical {
    display: flex;
    flex-direction: column;
    height: 100%;

    .tabs-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  &.horizontal {
    display: flex;
    flex-direction: row;
    white-space: nowrap;

    .tabs-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      padding: 0 10px;
    }
  }
}
</style>
