import { onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue';

import type { ShallowRef } from 'vue';

export type FeatureTransitionPhase = 'idle' | 'leaving' | 'entering';

export interface UseFeatureStoryMotionOptions {
  rootRef: Readonly<ShallowRef<HTMLElement | null>>;
  featureCount: number;
  exitDuration?: number;
  enterDuration?: number;
  reducedMotion?: () => boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useFeatureStoryMotion({
  rootRef,
  featureCount,
  exitDuration = 180,
  enterDuration = 320,
  reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
}: UseFeatureStoryMotionOptions) {
  const introProgress = shallowRef(0);
  const requestedIndex = shallowRef(0);
  const renderedIndex = shallowRef(0);
  const phase = shallowRef<FeatureTransitionPhase>('idle');
  const stepElements: Array<HTMLElement | null> = [];

  let animationFrameId: number | null = null;
  let transitionTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTransitionTimer = () => {
    if (transitionTimer === null) return;
    clearTimeout(transitionTimer);
    transitionTimer = null;
  };

  const beginLeaving = () => {
    if (phase.value !== 'idle' || requestedIndex.value === renderedIndex.value) return;

    phase.value = 'leaving';
    clearTransitionTimer();
    transitionTimer = setTimeout(() => {
      renderedIndex.value = requestedIndex.value;
      phase.value = 'entering';
      transitionTimer = setTimeout(() => {
        transitionTimer = null;
        phase.value = 'idle';
        if (requestedIndex.value !== renderedIndex.value) beginLeaving();
      }, enterDuration);
    }, exitDuration);
  };

  const requestFeature = (index: number) => {
    const highestIndex = Math.max(0, featureCount - 1);
    const nextIndex = clamp(Math.trunc(index), 0, highestIndex);
    requestedIndex.value = nextIndex;

    if (reducedMotion()) {
      clearTransitionTimer();
      renderedIndex.value = nextIndex;
      phase.value = 'idle';
      return;
    }

    beginLeaving();
  };

  const setStepRef = (index: number, element: HTMLElement | null) => {
    stepElements[index] = element;
  };

  const syncFromScroll = () => {
    const rootElement = rootRef.value;
    if (!rootElement || typeof window === 'undefined') return;

    const viewportHeight = Math.max(window.innerHeight, 1);
    const introStart = viewportHeight * 0.72;
    const introEnd = viewportHeight * 0.14;
    const rootTop = rootElement.getBoundingClientRect().top;
    introProgress.value = clamp((introStart - rootTop) / (introStart - introEnd), 0, 1);

    const activationLine = viewportHeight * 0.52;
    let nextIndex = 0;
    stepElements.forEach((element, index) => {
      if (element && element.getBoundingClientRect().top <= activationLine) {
        nextIndex = index;
      }
    });
    requestFeature(nextIndex);
  };

  const scheduleSync = () => {
    if (animationFrameId !== null) return;
    animationFrameId = window.requestAnimationFrame(() => {
      animationFrameId = null;
      syncFromScroll();
    });
  };

  onMounted(() => {
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
    scheduleSync();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', scheduleSync);
    window.removeEventListener('resize', scheduleSync);
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    clearTransitionTimer();
  });

  return {
    introProgress: readonly(introProgress),
    requestedIndex: readonly(requestedIndex),
    renderedIndex: readonly(renderedIndex),
    phase: readonly(phase),
    requestFeature,
    setStepRef,
    syncFromScroll,
  };
}
