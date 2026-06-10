import { onMounted, onUnmounted, ref, toValue, watch } from 'vue';

import type { MaybeRefOrGetter, Ref } from 'vue';

interface UseInfiniteScrollOptions {
  canLoadMore: MaybeRefOrGetter<boolean>;
  isLoading: MaybeRefOrGetter<boolean>;
  loadMore: () => Promise<unknown> | unknown;
  rootMargin?: string;
  threshold?: number;
}

export function useInfiniteScroll({
  canLoadMore,
  isLoading,
  loadMore,
  rootMargin = '200px 0px',
  threshold = 0,
}: UseInfiniteScrollOptions): {
  infiniteSentinel: Ref<HTMLElement | null>;
  tryLoadMore: () => Promise<void>;
} {
  const infiniteSentinel = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;
  let loadInFlight = false;

  const refreshObservation = () => {
    const element = infiniteSentinel.value;
    if (!observer || !element) return;

    observer.unobserve(element);
    observer.observe(element);
  };

  const tryLoadMore = async () => {
    if (loadInFlight || !toValue(canLoadMore) || toValue(isLoading)) return;

    loadInFlight = true;
    try {
      await loadMore();
    } finally {
      loadInFlight = false;
    }
  };

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void tryLoadMore();
        }
      },
      { rootMargin, threshold },
    );

    watch(
      infiniteSentinel,
      (element, previousElement) => {
        if (previousElement) observer?.unobserve(previousElement);
        if (element) observer?.observe(element);
      },
      { immediate: true },
    );
  });

  watch(
    [() => toValue(canLoadMore), () => toValue(isLoading)],
    ([canLoad, loading], [previousCanLoad, previousLoading]) => {
      const becameEligible = canLoad && !loading && (!previousCanLoad || previousLoading);
      if (becameEligible) refreshObservation();
    },
    { flush: 'post' },
  );

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });

  return {
    infiniteSentinel,
    tryLoadMore,
  };
}
