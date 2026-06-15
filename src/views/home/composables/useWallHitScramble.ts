import { createScrambler, type CreateScramblerOptions, type ScrambleInstance } from '@scrambl/core';
import { computed, onMounted, onUnmounted, readonly, ref } from 'vue';
import { CODERX_ROLE_TITLES, DEFAULT_SCRAMBLE_PRESET, getRandomScrambleChars, SCRAMBLE_PRESETS, type ScrambleCharset } from '@/components/scramble';

type HeadlessScrambleStyle = Omit<CreateScramblerOptions, 'text' | 'fromText' | 'onFrame' | 'onStart' | 'onChange' | 'onComplete'>;

export function useWallHitScramble() {
  const frame = ref('');
  const targetIndex = ref(0);
  const isInitialized = ref(false);
  const target = computed(() => CODERX_ROLE_TITLES[targetIndex.value]);
  const screenFrame = computed(() => frame.value.toLowerCase());
  const prefersReducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeScrambler: ScrambleInstance | null = null;
  let hasSkippedFirstWallHit = false;
  let previousChars: ScrambleCharset | undefined;
  let transitionToken = 0;

  const style = SCRAMBLE_PRESETS[DEFAULT_SCRAMBLE_PRESET] as HeadlessScrambleStyle;

  function stopActiveScrambler() {
    transitionToken += 1;
    activeScrambler?.destroy();
    activeScrambler = null;
  }

  function startTransition(markInitializedOnComplete = false) {
    const fromText = frame.value;
    stopActiveScrambler();
    const token = transitionToken;
    const nextTarget = target.value;
    const chars = getRandomScrambleChars(previousChars);
    previousChars = chars;

    activeScrambler = createScrambler({
      ...style,
      chars,
      fromText,
      text: nextTarget,
      onFrame: (nextFrame) => {
        if (token !== transitionToken) return;
        frame.value = nextFrame;
      },
      onComplete: () => {
        if (token !== transitionToken) return;
        frame.value = nextTarget;
        activeScrambler = null;
        if (markInitializedOnComplete) {
          isInitialized.value = true;
        }
      },
    });
  }

  function advanceOnWallHit() {
    if (!isInitialized.value) return;
    if (!hasSkippedFirstWallHit) {
      hasSkippedFirstWallHit = true;
      return;
    }

    targetIndex.value = (targetIndex.value + 1) % CODERX_ROLE_TITLES.length;
    if (prefersReducedMotion) {
      frame.value = target.value;
      return;
    }

    startTransition();
  }

  onMounted(() => {
    targetIndex.value = 0;
    frame.value = '';
    hasSkippedFirstWallHit = false;

    if (prefersReducedMotion) {
      frame.value = target.value;
      isInitialized.value = true;
      return;
    }

    startTransition(true);
  });

  onUnmounted(stopActiveScrambler);

  return {
    frame: readonly(frame),
    screenFrame: readonly(screenFrame),
    target: readonly(target),
    targetIndex: readonly(targetIndex),
    isInitialized: readonly(isInitialized),
    advanceOnWallHit,
  };
}
