<template>
  <ScrambleWord
    v-if="!prefersReducedMotion"
    :key="renderKey"
    v-bind="{ ...effectiveOptions, ...attrs }"
    :as="props.as"
    @scramble-complete="handleComplete"
  />
  <component :is="props.as" v-else v-bind="attrs">{{ currentWord }}</component>
</template>

<script setup lang="ts">
import type { UseScrambleOptions } from '@scrambl/vue';
import ScrambleWord from './ScrambleWord.vue';
import { DEFAULT_SCRAMBLE_PRESET, SCRAMBLE_PRESETS } from './scramble.constants';
import type { CyclingScrambleTextProps } from './scramble.types';

defineOptions({ inheritAttrs: false });

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
const prefersReducedMotion = ref(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
);
let cycleTimer: number | undefined;

const effectiveWords = computed(() => {
  const words = props.words.filter((word) => word.length > 0);
  if (words.length) return words;
  return props.text ? [props.text] : [''];
});

const currentWord = computed(() => effectiveWords.value[activeIndex.value % effectiveWords.value.length] ?? '');

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
