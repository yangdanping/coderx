<template>
  <div ref="rootRef" class="navbar-action-panel">
    <button
      ref="triggerRef"
      type="button"
      class="navbar-action-panel__trigger"
      :aria-label="ariaLabel"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="togglePanel"
    >
      <slot name="trigger" :is-open="isOpen"></slot>
    </button>

    <Transition name="navbar-action-panel">
      <section
        v-if="isOpen"
        ref="popupRef"
        class="navbar-action-panel__popup"
        role="dialog"
        :aria-label="title"
        :style="popupStyle"
      >
        <div class="navbar-action-panel__header">
          <div class="navbar-action-panel__title">
            <slot name="title-icon"></slot>
            <span>{{ title }}</span>
          </div>
          <slot name="header-action" :close="closePanel"></slot>
        </div>

        <div class="navbar-action-panel__body">
          <slot :close="closePanel"></slot>
        </div>

        <div v-if="$slots.footer" class="navbar-action-panel__footer">
          <slot name="footer" :close="closePanel"></slot>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    title: string;
    ariaLabel: string;
  }>(),
  {
    title: '',
    ariaLabel: '打开面板',
  },
);

const emit = defineEmits<{
  open: [];
  close: [];
}>();

const MOBILE_BREAKPOINT = 768;
const POPUP_GAP = 12;
const VIEWPORT_PADDING = 12;

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const popupRef = ref<HTMLElement | null>(null);
const popupStyle = ref<Record<string, string>>({});
const isOpen = ref(false);

const isMobileViewport = () => window.innerWidth <= MOBILE_BREAKPOINT;

const updatePopupPosition = () => {
  if (!isOpen.value || isMobileViewport()) {
    popupStyle.value = {};
    return;
  }

  const trigger = triggerRef.value;
  const popup = popupRef.value;
  if (!trigger || !popup) return;

  const triggerRect = trigger.getBoundingClientRect();
  const popupWidth = popup.offsetWidth;
  const viewportWidth = document.documentElement.clientWidth;

  // 弹窗右缘与触发按钮右缘对齐
  let right = viewportWidth - triggerRect.right;

  // 避免弹窗超出视口左侧
  const popupLeft = triggerRect.right - popupWidth;
  if (popupLeft < VIEWPORT_PADDING) {
    right = Math.max(VIEWPORT_PADDING, viewportWidth - popupWidth - VIEWPORT_PADDING);
  }

  popupStyle.value = {
    top: `${triggerRect.bottom + POPUP_GAP}px`,
    right: `${right}px`,
    left: 'auto',
  };
};

const openPanel = () => {
  if (isOpen.value) return;
  isOpen.value = true;
  emit('open');
};

const closePanel = () => {
  if (!isOpen.value) return;
  isOpen.value = false;
  emit('close');
};

const togglePanel = () => {
  if (isOpen.value) {
    closePanel();
  } else {
    openPanel();
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  const root = rootRef.value;
  if (!root || !isOpen.value) return;
  if (event.composedPath().includes(root)) return;
  closePanel();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closePanel();
  }
};

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    updatePopupPosition();
    window.addEventListener('resize', updatePopupPosition);
    return;
  }

  window.removeEventListener('resize', updatePopupPosition);
  popupStyle.value = {};
});

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', updatePopupPosition);
});

defineExpose({
  closePanel,
});

void props;
</script>

<style lang="scss" scoped>
.navbar-action-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &__trigger {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--text-secondary);
    background: transparent;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;

    &:hover,
    &[aria-expanded='true'] {
      color: var(--el-color-primary);
      background: var(--glass-bg);
    }

    &:active {
      transform: scale(0.96);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }

  &__popup {
    position: fixed;
    z-index: var(--z-navbar-popup);
    display: flex;
    flex-direction: column;
    width: var(--navbar-action-panel-width, 380px);
    height: var(--navbar-action-panel-height, 400px);
    max-width: calc(100vw - 24px);
    overflow: hidden;
    @include glass-effect-popup;
    border-radius: 8px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding: 0 14px;
    @include thin-border(bottom, var(--el-border-color-lighter));
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 15px;
    font-weight: 650;
    color: var(--text-primary);
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }

  &__footer {
    @include thin-border(top, var(--el-border-color-lighter));
  }
}

.navbar-action-panel-enter-active,
.navbar-action-panel-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.navbar-action-panel-enter-from,
.navbar-action-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .navbar-action-panel {
    &__trigger {
      width: 44px;
      height: 44px;
    }

    &__popup {
      position: fixed;
      top: calc(var(--navbarHeight) + 8px);
      right: 10px;
      left: 10px;
      width: auto;
      height: min(70vh, 460px);
      max-width: none;
      border-radius: 8px;
    }

    &__header {
      min-height: 48px;
    }
  }
}
</style>
