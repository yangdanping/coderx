import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface UsePullToRefreshOptions {
  containerRef: Ref<HTMLElement | null>;
  onRefresh: () => Promise<unknown>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({ containerRef, onRefresh, threshold = 70, maxPull = 120 }: UsePullToRefreshOptions) {
  const pullDistance = ref(0);
  const isRefreshing = ref(false);
  const isPulling = ref(false);

  let startY = 0;
  let currentY = 0;

  function isAtTop(): boolean {
    return window.scrollY <= 0;
  }

  function onTouchStart(e: TouchEvent) {
    if (!isAtTop() || isRefreshing.value) return;
    startY = e.touches[0].clientY;
    isPulling.value = true;
  }

  function onTouchMove(e: TouchEvent) {
    if (!isPulling.value || isRefreshing.value) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff < 0) {
      pullDistance.value = 0;
      return;
    }

    const dampened = Math.min(diff * 0.45, maxPull);
    pullDistance.value = dampened;

    if (diff > 10) {
      e.preventDefault();
    }
  }

  async function onTouchEnd() {
    if (!isPulling.value || isRefreshing.value) return;
    isPulling.value = false;

    if (pullDistance.value >= threshold) {
      isRefreshing.value = true;
      pullDistance.value = threshold * 0.6;
      try {
        await onRefresh();
      } finally {
        isRefreshing.value = false;
        pullDistance.value = 0;
      }
    } else {
      pullDistance.value = 0;
    }
  }

  onMounted(() => {
    const el = containerRef.value;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  });

  onUnmounted(() => {
    const el = containerRef.value;
    if (!el) return;
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  });

  return {
    pullDistance,
    isRefreshing,
    isPulling,
  };
}
