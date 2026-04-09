<template>
  <div class="flow-cord-widget" :style="cordStyle">
    <div class="flow-cord-outside">
      <div class="flow-cord-wrap" :class="{ 'is-visible': cordRevealed, 'is-editor-open': panelOpen }">
        <button type="button" class="flow-cord-handle" :aria-expanded="panelOpen" :aria-controls="controlsId" @click="onCordClick">
          <img src="@/assets/img/pull.png" alt="" class="flow-rope-img" draggable="false" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router';

const LEAVE_MS = 420;

/** 与 Flow 主列一致；父未设 `--flow-column-width` 时用此回退 */
const FLOW_COLUMN_FALLBACK = 'clamp(340px, 55vw, 880px)';

const props = withDefaults(
  defineProps<{
    /** aria-controls 目标 id */
    controlsId?: string;
    /** 完全覆盖距视口右侧的距离（含单位），例如 `max(1rem, 10%)` */
    cordRight?: string;
    /**
     * 锚定在主列右缘左侧的像素（沿「视口右缘 → 主列右缘」方向再向左偏多少）。
     * 与 Edit 页 `.rope-icon-wrapper { right: 40px }` 同一语义。
     */
    cordAnchorInsetPx?: number;
  }>(),
  {
    controlsId: 'flow-cord-panel',
    cordAnchorInsetPx: -112,
  },
);

const panelOpen = defineModel<boolean>({ default: false });

const cordRevealed = ref(false);

/** 勿在元素上写 `var(--flow-cord-right, …)` 引用自身，易导致解析失败、`fixed right` 失效 */
const cordStyle = computed(() => {
  if (props.cordRight != null && props.cordRight !== '') {
    return { '--flow-cord-right': props.cordRight };
  }
  const inset = props.cordAnchorInsetPx;
  return {
    '--flow-cord-right': `max(0.75rem, calc((100vw - var(--flow-column-width, ${FLOW_COLUMN_FALLBACK})) / 2 + ${inset}px + env(safe-area-inset-right, 0px)))`,
  };
});

function onCordClick() {
  panelOpen.value = !panelOpen.value;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  requestAnimationFrame(() => {
    cordRevealed.value = true;
  });
});

onBeforeRouteLeave((_to, _from, next) => {
  panelOpen.value = false;
  cordRevealed.value = false;
  window.setTimeout(() => next(), LEAVE_MS);
});
</script>

<style lang="scss" scoped>
.flow-cord-widget {
  .flow-cord-outside {
    position: fixed;
    top: calc(var(--navbarHeight) - 6px);
    right: var(--flow-cord-right);
    z-index: var(--z-sticky);
    pointer-events: none;
  }

  .flow-cord-wrap {
    transform: translateY(-130%);
    opacity: 0;
    transition:
      transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1),
      opacity 0.35s cubic-bezier(0.25, 0.46, 0.45, 1);
    pointer-events: none;

    &.is-visible:not(.is-editor-open) {
      transform: translateY(-40%);
      opacity: 1;
      pointer-events: auto;
    }

    &.is-visible.is-editor-open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
  }

  .flow-cord-outside .flow-cord-wrap.is-visible {
    pointer-events: auto;
  }

  .flow-cord-handle {
    border: none;
    background: transparent;
    padding: 0;
    width: 30px;
    height: 150px;
    display: flex;
    justify-content: center;
    cursor: var(--cursorPointer, pointer);
    user-select: none;

    @media (hover: hover) and (pointer: fine) {
      &:hover .flow-rope-img {
        filter: drop-shadow(4px 7px 6px rgba(0, 0, 0, 0.35));
      }
    }
  }

  .flow-rope-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    filter: drop-shadow(4px 5px 5px rgba(0, 0, 0, 0.25));
    transition: filter 0.3s ease;
    pointer-events: none;
  }
}
</style>
