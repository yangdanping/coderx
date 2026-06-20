<template>
  <div ref="rootRef" class="navbar-action-panel">
    <button
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
      <section v-if="isOpen" class="navbar-action-panel__popup" role="dialog" :aria-label="title">
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

const rootRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

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

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
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
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
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

