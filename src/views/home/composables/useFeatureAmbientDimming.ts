import { onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue';

import type { ShallowRef } from 'vue';

export interface FeatureAmbientThresholds {
  entryStart: number;
  entryEnd: number;
  exitStart: number;
  exitEnd: number;
}

export interface UseFeatureAmbientDimmingOptions {
  rootRef: Readonly<ShallowRef<HTMLElement | null>>;
  thresholds?: FeatureAmbientThresholds;
}

type FeatureAmbientRect = Pick<DOMRectReadOnly, 'top' | 'bottom'>;

export const DEFAULT_FEATURE_AMBIENT_THRESHOLDS: FeatureAmbientThresholds = {
  entryStart: 1.02,
  entryEnd: 0.18,
  exitStart: 0.92,
  exitEnd: 0.28,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calculateFeatureAmbientProgress(rect: FeatureAmbientRect, viewportHeight: number, thresholds: FeatureAmbientThresholds = DEFAULT_FEATURE_AMBIENT_THRESHOLDS) {
  const safeViewportHeight = Math.max(viewportHeight, 1);
  const entryStart = safeViewportHeight * thresholds.entryStart;
  const entryEnd = safeViewportHeight * thresholds.entryEnd;
  const exitStart = safeViewportHeight * thresholds.exitStart;
  const exitEnd = safeViewportHeight * thresholds.exitEnd;

  const entryProgress = clamp((entryStart - rect.top) / (entryStart - entryEnd), 0, 1);
  const exitProgress = clamp((rect.bottom - exitEnd) / (exitStart - exitEnd), 0, 1);

  return Math.min(entryProgress, exitProgress);
}

export function useFeatureAmbientDimming({ rootRef, thresholds = DEFAULT_FEATURE_AMBIENT_THRESHOLDS }: UseFeatureAmbientDimmingOptions) {
  const progress = shallowRef(0);
  let animationFrameId: number | null = null;

  const syncFromScroll = () => {
    const rootElement = rootRef.value;
    if (!rootElement || typeof window === 'undefined') return;

    progress.value = calculateFeatureAmbientProgress(rootElement.getBoundingClientRect(), window.innerHeight, thresholds);
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
  });

  return {
    progress: readonly(progress),
    syncFromScroll,
  };
}
