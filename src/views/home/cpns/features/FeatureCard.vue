<template>
  <article
    ref="targetRef"
    class="feature-card"
    :class="[{ visible: isVisible }, `is-note-${props.noteSide}`]"
    :style="cardStyle"
    @transitionend="handleTransitionEnd"
  >
    <div class="feature-card__header">
      <svg class="feature-card__guide" viewBox="0 0 220 126" aria-hidden="true" focusable="false">
        <path
          class="feature-card__guide-path"
          d="M210 16C202 25 190 31 164 34C126 39 90 36 61 44C43 49 29 53 14 56"
          pathLength="1"
        />
        <path class="feature-card__guide-head" d="M27 43C21 49 17 53 14 56C20 61 26 65 34 68" pathLength="1" />
      </svg>

      <div class="feature-card__note">
        <p class="feature-card__eyebrow">Feature {{ indexLabel }}</p>
        <h3 class="feature-card__title">{{ title }}</h3>
        <p class="feature-card__description">{{ description }}</p>
      </div>
    </div>

    <div class="feature-card__panel">
      <div class="feature-card__demo">
        <slot />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useFadeIn } from '@/composables/useFadeIn';

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    delay?: number;
    index?: number;
    markerSpeed?: number;
    noteSide?: 'left' | 'right';
  }>(),
  {
    delay: 0,
    index: 1,
    markerSpeed: 800,
    noteSide: 'left',
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

const indexLabel = computed(() => String(props.index).padStart(2, '0'));

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
  reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion = reducedMotionMql.matches;
  reducedMotionMql.addEventListener('change', handleReducedMotionChange);
  // passive:true 告诉浏览器"我不会 preventDefault"，可以放心走 GPU 合成层，
  // 不会因为事件处理阻塞滚动手感。
  window.addEventListener('scroll', scheduleScrollMask, { passive: true });
  window.addEventListener('resize', scheduleScrollMask, { passive: true });
  applyScrollMask();
});

const cardStyle = computed(() => ({
  transitionDelay: `${props.delay}ms`,
  '--note-speed': `${Math.max(560, props.markerSpeed)}ms`,
  '--note-delay': `${props.delay + 80}ms`,
  '--guide-delay': `${props.delay + 320}ms`,
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
  /* 初始值：scroll handler 会根据卡片与视口中心的距离实时覆写。 */
  --mask-inner: 45%;
  --demo-blur: 6px;
  --demo-opacity: 0.82;
  --guide-ink: rgb(226 72 43 / 0.9);
  position: relative;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;

  :where(html.dark) & {
    --guide-ink: rgb(248 124 91 / 0.88);
  }

  &.visible {
    opacity: 1;
    transform: translateY(0);

    .feature-card__note {
      opacity: 1;
      transform: translateY(0) rotate(var(--note-rotation)) scale(1);
    }

    .feature-card__guide {
      opacity: 1;
    }

    .feature-card__guide-path {
      animation: feature-card-guide-draw 2400ms cubic-bezier(0.25, 1, 0.5, 1) var(--guide-delay) forwards;
      animation-iteration-count: 1;
    }

    .feature-card__guide-head {
      animation: feature-card-guide-draw 620ms cubic-bezier(0.25, 1, 0.5, 1) calc(var(--guide-delay) + 1880ms) forwards;
      animation-iteration-count: 1;
    }
  }

  &__header {
    position: relative;
    z-index: 2;
    margin: 0 14px 18px;
    pointer-events: none;
  }

  &__guide {
    position: absolute;
    z-index: 2;
    top: -70px;
    right: -4px;
    width: clamp(126px, 22vw, 176px);
    height: auto;
    overflow: visible;
    opacity: 0;
    color: var(--guide-ink);
    transition: opacity 160ms linear var(--guide-delay);
  }

  &__guide-path,
  &__guide-head {
    fill: none;
    stroke: currentColor;
    stroke-width: 6;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 0.025 0.055;
    stroke-dashoffset: 1;
    vector-effect: non-scaling-stroke;
  }

  &__note {
    --note-surface: rgb(255 255 255 / 0.42);
    --note-tint: rgb(253 214 99 / 0.14);
    --note-paper-deep: rgb(253 214 99 / 0.26);
    --note-edge: rgb(206 158 38 / 0.3);
    --note-ink: rgb(66 58 38);
    --note-rotation: -1.1deg;
    --note-start-rotation: -3deg;

    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(100%, 640px);
    padding: clamp(20px, 3vw, 30px) clamp(20px, 3vw, 34px) clamp(24px, 3.4vw, 36px);
    color: var(--note-ink);
    background: linear-gradient(135deg, var(--note-tint), rgb(255 255 255 / 0.24) 52%, rgb(253 214 99 / 0.08)), var(--note-surface);
    -webkit-backdrop-filter: blur(10px) saturate(118%);
    backdrop-filter: blur(10px) saturate(118%);
    border: 1px solid var(--note-edge);
    box-shadow:
      0 10px 28px rgb(92 73 28 / 0.08),
      1px 1px 0 rgb(255 255 255 / 0.32) inset;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%);
    opacity: 0;
    transform: translateY(18px) rotate(var(--note-start-rotation)) scale(0.97);
    transform-origin: 35% 65%;
    transition:
      opacity 260ms linear var(--note-delay),
      transform var(--note-speed) cubic-bezier(0.16, 1, 0.3, 1) var(--note-delay);

    &::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: 0;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, rgb(255 255 255 / 0.64), var(--note-paper-deep));
      clip-path: polygon(100% 0, 0 100%, 100% 100%);
      filter: drop-shadow(-2px -2px 2px rgb(103 69 0 / 0.12));
    }

    :where(html.dark) & {
      --note-surface: rgb(35 38 48 / 0.68);
      --note-tint: rgb(253 214 99 / 0.1);
      --note-paper-deep: rgb(253 214 99 / 0.18);
      --note-edge: rgb(253 214 99 / 0.34);
      --note-ink: rgb(244 236 208);
      box-shadow:
        0 12px 30px rgb(0 0 0 / 0.16),
        1px 1px 0 rgb(255 255 255 / 0.06) inset;
    }
  }

  &__eyebrow {
    margin: 0;
    font-size: 12px;
    font-family: 'SFMono-Regular', Consolas, monospace;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: currentColor;
    opacity: 0.66;
  }

  &__title {
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
    color: currentColor;
  }

  &__description {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: currentColor;
    opacity: 0.78;
  }

  &__panel {
    @include glass-effect;
    display: flex;
    min-height: 540px;
    padding: 24px;
    overflow: hidden;
    border: 1px dashed rgb(148 184 238 / 0.5);
    border-top: 2px solid rgb(148 184 238 / 0.5);
    border-bottom: none;
    transition:
      border-color 0.3s cubic-bezier(0.65, 0, 0.35, 1),
      box-shadow 0.3s cubic-bezier(0.65, 0, 0.35, 1);
    /* mask-image 只读取 Alpha，与具体颜色无关，天然适配 Dark/Light。 */
    -webkit-mask-image: radial-gradient(ellipse 95% 85% at 50% 45%, #000 var(--mask-inner), rgb(0 0 0 / 0.55) calc(var(--mask-inner) + 22%), transparent 100%);
    mask-image: radial-gradient(ellipse 95% 85% at 50% 45%, #000 var(--mask-inner), rgb(0 0 0 / 0.55) calc(var(--mask-inner) + 22%), transparent 100%);

    :where(html.dark) & {
      border-color: rgb(148 184 238 / 0.4);
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

@keyframes feature-card-guide-draw {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@media (min-width: 1320px) {
  .feature-card {
    &__header {
      position: absolute;
      top: 42px;
      width: clamp(220px, 15vw, 248px);
      margin: 0;
    }

    &__note {
      width: 100%;
    }

    &__guide {
      top: -42px;
      width: clamp(132px, 9.5vw, 166px);
    }

    &.is-note-left {
      .feature-card__header {
        right: calc(100% + 64px);
      }

      .feature-card__guide {
        right: auto;
        left: calc(100% + 8px);
      }
    }

    &.is-note-right {
      .feature-card__header {
        left: calc(100% + 64px);
      }

      .feature-card__note {
        --note-rotation: 1.1deg;
        --note-start-rotation: 3deg;
      }

      .feature-card__guide {
        right: calc(100% + 8px);
        left: auto;
        transform: scaleX(-1);
        transform-origin: center;
      }
    }
  }
}

@media (max-width: 768px) {
  .feature-card {
    &__header {
      margin-inline: 0;
    }

    &__note {
      padding: 20px 18px 26px;
    }

    &__title {
      font-size: 22px;
    }

    &__guide {
      top: -58px;
      right: -12px;
      width: 128px;
    }

    &__panel {
      min-height: 640px;
      padding: 18px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-card {
    --mask-inner: 150%;
    --demo-blur: 0px;
    --demo-opacity: 1;
    transition: none;

    &__note {
      opacity: 1;
      transform: rotate(var(--note-rotation));
      transition: none;
    }

    &__guide {
      opacity: 1;
      transition: none;
    }

    &__guide-path,
    &__guide-head {
      animation: none !important;
      stroke-dashoffset: 0;
    }
  }
}
</style>
