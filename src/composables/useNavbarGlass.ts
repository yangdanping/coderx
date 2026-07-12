import { onMounted, onUnmounted, readonly, shallowRef, toValue, watch } from 'vue';

import type { MaybeRefOrGetter } from 'vue';

interface UseNavbarGlassOptions {
  start: MaybeRefOrGetter<number>;
  end: MaybeRefOrGetter<number>;
}

export function calculateNavbarGlassProgress(scrollY: number, start: number, end: number) {
  const safeScrollY = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
  const requestedEnd = Number.isFinite(end) ? Math.max(0, end) : safeStart + 1;
  const safeEnd = Math.max(safeStart + 1, requestedEnd);

  return Math.min(1, Math.max(0, (safeScrollY - safeStart) / (safeEnd - safeStart)));
}

export function useNavbarGlass(options: UseNavbarGlassOptions) {
  const initialScrollY = typeof window === 'undefined' ? 0 : window.scrollY;
  const progress = shallowRef(calculateNavbarGlassProgress(initialScrollY, toValue(options.start), toValue(options.end)));
  let animationFrameId: number | null = null;
  let isMounted = false;

  const updateProgress = () => {
    animationFrameId = null;
    progress.value = calculateNavbarGlassProgress(window.scrollY, toValue(options.start), toValue(options.end));
  };

  const scheduleUpdate = () => {
    if (!isMounted || animationFrameId !== null) return;
    animationFrameId = window.requestAnimationFrame(updateProgress);
  };

  watch([() => toValue(options.start), () => toValue(options.end)], scheduleUpdate);

  onMounted(() => {
    isMounted = true;
    updateProgress();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
  });

  onUnmounted(() => {
    isMounted = false;
    window.removeEventListener('scroll', scheduleUpdate);
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  });

  return {
    progress: readonly(progress),
  };
}
