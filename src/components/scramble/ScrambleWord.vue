<template>
  <component :is="props.as" ref="targetRef" />
</template>

<script setup lang="ts">
import { useScramble, type UseScrambleOptions } from '@scrambl/vue';
import type { ScrambleWordProps } from './scramble.types';

const props = withDefaults(defineProps<ScrambleWordProps>(), {
  as: 'span',
  override: undefined,
  reversed: undefined,
  loop: undefined,
  playOnMount: undefined,
});

const emit = defineEmits<{
  'scramble-start': [];
  'scramble-change': [text: string, progress: number];
  'scramble-complete': [];
}>();

const options: UseScrambleOptions = {
  text: props.text,
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
  onStart: () => {
    props.onStart?.();
    emit('scramble-start');
  },
  onChange: (text, progress) => {
    props.onChange?.(text, progress);
    emit('scramble-change', text, progress);
  },
  onComplete: () => {
    props.onComplete?.();
    emit('scramble-complete');
  },
};

const { ref: targetRef } = useScramble(options);
</script>
