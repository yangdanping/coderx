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

/**
 * Scroll-linked mask：根据卡片中心与视口中心的距离，实时驱动
 * --mask-inner / --demo-blur / --demo-opacity 三个 CSS 变量。
 * 卡片处于视口中心附近时 mask 完全打开、demo 清晰；
 * 越远离中心，mask 越收、demo 越模糊。
 */
const MASK_INNER_NEAR = 150; // 百分比：完全展开
const MASK_INNER_FAR = 45; // 百分比：起始收缩态
const BLUR_MAX = 6; // 像素：最模糊
const OPACITY_MIN = 0.82;
/** 以 half-viewport 为单位；小于此值认为已"处于中心"，完全清晰 */
const CLEAR_BAND = 0.18;
/** 以 half-viewport 为单位；大于此值认为已"远离中心"，完全收束 */
const MASKED_BAND = 0.9;

let rafId: number | null = null;
let prefersReducedMotion = false;

/**
 * 把"距离"映射成 0~1 的进度值：0=完全在中心，1=完全远离。
 *
 * 最后用 smoothstep 曲线 `3t² − 2t³` 代替线性 `t`，让进入/离开
 * 中心带的两头更柔和、中间变化更明显，避免生硬的"线性滑动"观感。
 */
function computeProgress(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  if (vh <= 0) return 1;
  const cardCenter = rect.top + rect.height / 2;
  const viewportCenter = vh / 2;
  const raw = Math.abs(cardCenter - viewportCenter) / (vh / 2);
  if (raw <= CLEAR_BAND) return 0;
  if (raw >= MASKED_BAND) return 1;
  const t = (raw - CLEAR_BAND) / (MASKED_BAND - CLEAR_BAND);
  return t * t * (3 - 2 * t); // smoothstep
}

/**
 * 真正执行一次 DOM 写入：根据进度把三个 CSS 变量直接写到元素的 inline style 上。
 *
 * 这里刻意绕开 Vue 的响应式系统——scroll 每秒可能触发上百次，
 * 走 ref/computed 会让整条响应式链路被重新触发，成本远大于直接 setProperty。
 * 这类"视觉附属量"既不参与业务状态，也没人 watch 它们，inline 写入最划算。
 */
function applyScrollMask() {
  rafId = null;
  const el = targetRef.value as HTMLElement | null;
  if (!el) return;
  if (prefersReducedMotion) {
    el.style.setProperty('--mask-inner', `${MASK_INNER_NEAR}%`);
    el.style.setProperty('--demo-blur', '0px');
    el.style.setProperty('--demo-opacity', '1');
    return;
  }
  const progress = computeProgress(el);
  const maskInner = MASK_INNER_NEAR - progress * (MASK_INNER_NEAR - MASK_INNER_FAR);
  const blur = progress * BLUR_MAX;
  const opacity = 1 - progress * (1 - OPACITY_MIN);
  el.style.setProperty('--mask-inner', `${maskInner.toFixed(2)}%`);
  el.style.setProperty('--demo-blur', `${blur.toFixed(2)}px`);
  el.style.setProperty('--demo-opacity', opacity.toFixed(3));
}

/**
 * requestAnimationFrame 节流。
 *
 * 背景：浏览器滚动时 1 秒内可能派发几十甚至上百次 scroll 事件，
 * 但屏幕每秒只刷新 60 次 —— 一帧内把 mask 重算 N 次是纯粹浪费。
 *
 * 做法：首次触发时用 rAF 预订"下一帧再计算"，并用 rafId 作为"已预订"锁；
 *      在这一帧真正执行（applyScrollMask）之前，后续所有 scroll 事件
 *      都会直接 return，不做任何事。一帧最多算一次，既不漏帧也不做重复计算。
 *
 * 相比 setTimeout/throttle：rAF 会自动和浏览器渲染节奏对齐，
 * 在掉电省显节流时还会自动降频，比固定时间窗口更聪明。
 */
function scheduleScrollMask() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(applyScrollMask);
}

/**
 * 监听系统的"减少动效"偏好变化。
 * 用户可能在运行时切换系统设置（macOS 的"减弱动态效果"），
 * 这里用 MediaQueryList + change 事件实时响应，触发一次重算直接落到终态。
 */
let reducedMotionMql: MediaQueryList | null = null;
const handleReducedMotionChange = (ev: MediaQueryListEvent) => {
  prefersReducedMotion = ev.matches;
  scheduleScrollMask();
};

onMounted(() => {
  nextTick(() => {
    updateDotGrid();
    if (headerRef.value && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateDotGrid());
      ro.observe(headerRef.value);
    }
    reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = reducedMotionMql.matches;
    reducedMotionMql.addEventListener('change', handleReducedMotionChange);
    // passive:true 告诉浏览器"我不会 preventDefault"，可以放心走 GPU 合成层，
    // 不会因为事件处理阻塞滚动手感。
    window.addEventListener('scroll', scheduleScrollMask, { passive: true });
    window.addEventListener('resize', scheduleScrollMask, { passive: true });
    applyScrollMask();
  });
});

const cardStyle = computed(() => ({
  transitionDelay: `${props.delay}ms`,
  '--marker-speed': `${props.markerSpeed}ms`,
  '--marker-delay-title': `${props.delay}ms`,
  '--marker-delay-desc': `${props.delay + props.markerSpeed}ms`,
}));

/**
 * 视觉 mask 已经由 scroll 驱动、和激活状态解耦；
 * 这里的 activate 事件仍保留 —— FeatureSection 用它把 activatedCards[id] 置 true，
 * 进而让 demo 组件（:active）播入场动画。视觉与业务语义互不干扰。
 */
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

/**
 * 卸载时清理所有外部订阅与未完成的 rAF，避免卡片切换/路由跳转后
 * 仍有回调在已销毁的组件上跑，进而读到空的 targetRef。
 */
onBeforeUnmount(() => {
  activationTimer && clearTimeout(activationTimer);
  ro?.disconnect();
  ro = null;
  window.removeEventListener('scroll', scheduleScrollMask);
  window.removeEventListener('resize', scheduleScrollMask);
  reducedMotionMql?.removeEventListener('change', handleReducedMotionChange);
  reducedMotionMql = null;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});
</script>

<style scoped lang="scss">
/* 由 FeatureCard 的 scroll handler 按帧写入；@property 仅保障类型安全与 calc() 行为 */
@property --mask-inner {
  syntax: '<percentage>';
  initial-value: 45%;
  inherits: false;
}
@property --demo-blur {
  syntax: '<length>';
  initial-value: 6px;
  inherits: false;
}
@property --demo-opacity {
  syntax: '<number>';
  initial-value: 0.82;
  inherits: false;
}

.feature-card {
  @include glass-effect;
  /* 点阵深浅：只改这两个变量即可（数值越大越明显） */
  --feature-dot-opacity-low: 0.03;
  --feature-dot-opacity-high: 0.1;
  /* 初始值：未进入视口中心时应当保留 mask 效果；scroll handler 会根据距离实时覆写 */
  --mask-inner: 45%;
  --demo-blur: 6px;
  --demo-opacity: 0.82;
  display: flex;
  flex-direction: column;
  padding: 24px;
  opacity: 0;
  transform: translateY(20px);
  border: 1px dashed rgba(148, 184, 238, 0.5);
  border-top: 2px solid rgba(148, 184, 238, 0.5);
  border-bottom: none;
  min-height: 540px;
  transition:
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  will-change: transform, opacity;
  overflow: hidden;
  /* mask-image 只读取 Alpha，与具体颜色无关，天然适配 Dark/Light */
  -webkit-mask-image: radial-gradient(ellipse 95% 85% at 50% 45%, #000 var(--mask-inner), rgba(0, 0, 0, 0.55) calc(var(--mask-inner) + 22%), transparent 100%);
  mask-image: radial-gradient(ellipse 95% 85% at 50% 45%, #000 var(--mask-inner), rgba(0, 0, 0, 0.55) calc(var(--mask-inner) + 22%), transparent 100%);

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
    filter: blur(var(--demo-blur));
    opacity: var(--demo-opacity);
    transform: translateZ(0);
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

@media (prefers-reduced-motion: reduce) {
  .feature-card {
    --mask-inner: 150%;
    --demo-blur: 0px;
    --demo-opacity: 1;
    transition: none;
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
