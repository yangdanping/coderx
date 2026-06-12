<template>
  <ScrambleWord
    v-if="!prefersReducedMotion"
    :key="renderKey"
    v-bind="{ ...effectiveOptions, ...attrs }"
    :as="props.as"
    :data-scramble-word="currentWord"
    @scramble-complete="handleComplete"
  />
  <component :is="props.as" v-else v-bind="attrs" :data-scramble-word="currentWord">
    <span>{{ staticWordPrefix }}</span>
    <span class="scramble-last-character">{{ staticWordSuffix }}</span>
  </component>
</template>

<script setup lang="ts">
import type { UseScrambleOptions } from '@scrambl/vue';
import ScrambleWord from './ScrambleWord.vue';
import { DEFAULT_SCRAMBLE_PRESET, SCRAMBLE_PRESETS } from './scramble.constants';
import type { CyclingScrambleTextProps } from './scramble.types';

defineOptions({ inheritAttrs: false });

// 基础配置：动画完成后等待 2 秒切词；未指定的布尔项沿用 Scrambl 默认值。
const props = withDefaults(defineProps<CyclingScrambleTextProps>(), {
  as: 'span',
  words: () => [],
  cycleDelay: 2000,
  preset: DEFAULT_SCRAMBLE_PRESET,
  override: undefined,
  reversed: undefined,
  loop: undefined,
  playOnMount: undefined,
});

const attrs = useAttrs();
const activeIndex = ref(0);
const renderKey = ref(0);
// 尊重系统“减少动态效果”偏好，开启时直接展示静态文本。
const prefersReducedMotion = ref(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
);
let cycleTimer: number | undefined;

// words 优先；未传时回退到官网提供的 text 配置。
const effectiveWords = computed(() => {
  const words = props.words.filter((word) => word.length > 0);
  if (words.length) return words;
  return props.text ? [props.text] : [''];
});

const currentWord = computed(() => effectiveWords.value[activeIndex.value % effectiveWords.value.length] ?? '');
const staticWordPrefix = computed(() => currentWord.value.slice(0, -1));
const staticWordSuffix = computed(() => currentWord.value.slice(-1));

// 预设先提供风格默认值，开发者显式传入的官网配置项拥有更高优先级。
const effectiveOptions = computed<UseScrambleOptions>(() => {
  const options: UseScrambleOptions = {
    ...SCRAMBLE_PRESETS[props.preset],
    text: currentWord.value,
  };

  const explicitOptions: UseScrambleOptions = {
    from: props.from,
    chars: props.chars,
    cursor: props.cursor,
    duration: props.duration,
    delay: props.delay,
    ease: props.ease,
    steps: props.steps,
    perturbation: props.perturbation,
    revealRate: props.revealRate,
    settleDuration: props.settleDuration,
    settleRate: props.settleRate,
    reversed: props.reversed,
    override: props.override,
    fill: props.fill,
    seed: props.seed,
    speed: props.speed,
    loop: props.loop,
    renderMode: props.renderMode,
    trigger: props.trigger,
    playOnMount: props.playOnMount,
    inViewOptions: props.inViewOptions,
    onStart: props.onStart,
    onChange: props.onChange,
    onComplete: props.onComplete,
  };

  for (const [key, value] of Object.entries(explicitOptions)) {
    if (value !== undefined) {
      Reflect.set(options, key, value);
    }
  }

  return options;
});

// 当前版本会在初始化时固化选项，配置变化后通过 key 重建动画实例。
const optionSignature = computed(() => ({
  words: props.words,
  text: props.text,
  preset: props.preset,
  from: props.from,
  chars: props.chars,
  cursor: props.cursor,
  duration: props.duration,
  delay: props.delay,
  ease: props.ease,
  steps: props.steps,
  perturbation: props.perturbation,
  revealRate: props.revealRate,
  settleDuration: props.settleDuration,
  settleRate: props.settleRate,
  reversed: props.reversed,
  override: props.override,
  fill: props.fill,
  seed: props.seed,
  speed: props.speed,
  loop: props.loop,
  renderMode: props.renderMode,
  trigger: props.trigger,
  playOnMount: props.playOnMount,
  inViewOptions: props.inViewOptions,
}));

function clearCycleTimer() {
  if (cycleTimer === undefined) return;
  window.clearTimeout(cycleTimer);
  cycleTimer = undefined;
}

// 仅在本轮动画完成后开始 cycleDelay，避免动画过程中提前切词。
function handleComplete() {
  clearCycleTimer();
  if (prefersReducedMotion.value || effectiveWords.value.length <= 1) return;

  cycleTimer = window.setTimeout(() => {
    activeIndex.value = (activeIndex.value + 1) % effectiveWords.value.length;
    renderKey.value += 1;
    cycleTimer = undefined;
  }, Math.max(0, props.cycleDelay));
}

watch(
  optionSignature,
  () => {
    clearCycleTimer();
    activeIndex.value = 0;
    renderKey.value += 1;
  },
  { deep: true },
);

watch(
  () => props.cycleDelay,
  () => clearCycleTimer(),
);

onUnmounted(clearCycleTimer);
</script>
