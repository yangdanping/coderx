<template>
  <article ref="targetRef" class="feature-card" :class="{ visible: isVisible }" :style="cardStyle" @transitionend="handleTransitionEnd">
    <div ref="headerRef" class="feature-card__header">
      <div class="feature-card__header-dots" aria-hidden="true" :style="headerDotsStyle">
        <div v-for="i in dotCount" :key="i" class="feature-card__dot" :style="dotPulseStyle(i - 1)" />
      </div>
      <div class="feature-card__header-content">
        <p class="feature-card__eyebrow">Feature {{ indexLabel }}</p>
        <h3 class="feature-card__title">
          <span class="marker marker--title">{{ title }}</span>
        </h3>
        <p class="feature-card__description">
          <span class="marker marker--desc">{{ description }}</span>
        </p>
      </div>
    </div>

    <div class="feature-card__demo">
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useFadeIn } from '@/composables/useFadeIn';

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    delay?: number;
    index?: number;
    markerSpeed?: number;
  }>(),
  {
    delay: 0,
    index: 1,
    markerSpeed: 800,
  },
);

const emit = defineEmits<{
  (e: 'activate'): void;
}>();

const { targetRef, isVisible } = useFadeIn({
  threshold: 0.18,
});

const hasActivated = ref(false);
let activationTimer: ReturnType<typeof setTimeout> | null = null;

const DOT_SIZE = 3;
const DOT_GAP = 8;
/** 点阵与 `feature-card__header` 边缘的内缩，形成视觉留白 */
const DOT_INSET = 10;

const headerRef = ref<HTMLElement | null>(null);
const dotColumns = ref(0);
const dotRows = ref(0);

const dotCount = computed(() => Math.max(0, dotColumns.value * dotRows.value));

const headerDotsStyle = computed(() => ({
  '--feature-dot-cols': String(Math.max(1, dotColumns.value)),
}));

const indexLabel = computed(() => String(props.index).padStart(2, '0'));

/** 稳定伪随机，避免 hydration/重绘时整片点阵动画相位乱跳 */
function dotPulseStyle(index: number) {
  let s = (index + 1) * 48271;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  const u1 = (s >>> 0) / 4294967296;
  s = (s + 2147483647) >>> 0;
  const u2 = (s >>> 0) / 4294967296;
  const duration = 3.15 + u1 * 0.95;
  const delay = u2 * 0.15;
  return {
    animationDuration: `${duration.toFixed(3)}s`,
    animationDelay: `${delay.toFixed(3)}s`,
  };
}

function updateDotGrid() {
  const el = headerRef.value;
  if (!el) return;
  const w = el.clientWidth - 2 * DOT_INSET;
  const h = el.clientHeight - 2 * DOT_INSET;
  if (w <= 0 || h <= 0) {
    dotColumns.value = 0;
    dotRows.value = 0;
    return;
  }
  const stride = DOT_SIZE + DOT_GAP;
  dotColumns.value = Math.max(1, Math.floor((w + DOT_GAP) / stride));
  dotRows.value = Math.max(1, Math.floor((h + DOT_GAP) / stride));
}

let ro: ResizeObserver | null = null;

onMounted(() => {
  void nextTick(() => {
    updateDotGrid();
    if (!headerRef.value || typeof ResizeObserver === 'undefined') return;
    ro = new ResizeObserver(() => updateDotGrid());
    ro.observe(headerRef.value);
  });
});

const cardStyle = computed(() => ({
  transitionDelay: `${props.delay}ms`,
  '--marker-speed': `${props.markerSpeed}ms`,
  '--marker-delay-title': `${props.delay}ms`,
  '--marker-delay-desc': `${props.delay + props.markerSpeed}ms`,
}));

const triggerActivate = () => {
  if (hasActivated.value) return;

  hasActivated.value = true;
  emit('activate');
};

const handleTransitionEnd = (e: TransitionEvent) => {
  if (hasActivated.value || e.target !== e.currentTarget || e.propertyName !== 'opacity') return;
  triggerActivate();
};

watch(isVisible, (visible) => {
  if (!visible || hasActivated.value) return;

  activationTimer && clearTimeout(activationTimer);

  activationTimer = setTimeout(() => {
    triggerActivate();
    activationTimer = null;
  }, props.delay + 720);
});

onBeforeUnmount(() => {
  activationTimer && clearTimeout(activationTimer);
  ro?.disconnect();
  ro = null;
});
</script>

<style scoped lang="scss">
.feature-card {
  @include glass-effect;
  /* 点阵深浅：只改这两个变量即可（数值越大越明显） */
  --feature-dot-opacity-low: 0.03;
  --feature-dot-opacity-high: 0.1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  opacity: 0;
  transform: translateY(20px);
  border: 2px dashed rgba(148, 184, 238, 0.5);
  min-height: 540px;
  transition:
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  will-change: transform, opacity;
  overflow: hidden;

  :where(html.dark) & {
    border-color: rgba(148, 184, 238, 0.4);
    --feature-dot-opacity-low: 0.11;
    --feature-dot-opacity-high: 0.3;
  }

  &.visible {
    opacity: 1;
    transform: translateY(0);

    .marker {
      background-size: 100% 8px;
    }
  }

  &__header {
    position: relative;
    z-index: 0;
    margin-bottom: 20px;
    overflow: hidden;
  }

  &__header-dots {
    position: absolute;
    inset: 0;
    z-index: 0;
    box-sizing: border-box;
    padding: 10px;
    pointer-events: none;
    display: grid;
    grid-template-columns: repeat(var(--feature-dot-cols, 24), 3px);
    gap: 8px;
    align-content: start;
    justify-content: start;
    overflow: hidden;
  }

  &__dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-primary);
    animation: feature-card-pulse-dot ease-in-out infinite;
  }

  &__header-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__eyebrow {
    margin: 0;
    font-size: 12px;
    font-family: 'SFMono-Regular', Consolas, monospace;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  &__title {
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
    color: var(--text-primary);
  }

  &__description {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  .marker {
    background: linear-gradient(var(--marker-color), var(--marker-color));
    background-repeat: no-repeat;
    background-position: 0 100%;
    background-size: 0% 8px;
    padding-bottom: 2px;
    transition: background-size var(--marker-speed) ease-in-out;

    &--title {
      transition-delay: var(--marker-delay-title);
    }

    &--desc {
      transition-delay: var(--marker-delay-desc);
    }
  }

  &__demo {
    flex: 1;
    min-height: 0;
  }
}

@keyframes feature-card-pulse-dot {
  0%,
  100% {
    opacity: var(--feature-dot-opacity-low);
  }

  50% {
    opacity: var(--feature-dot-opacity-high);
  }
}

@media (max-width: 768px) {
  .feature-card {
    padding: 18px;
    min-height: 640px;

    &__title {
      font-size: 22px;
    }
  }
}
</style>
