import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

export interface UseFadeInOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useFadeIn<T extends Element = HTMLDivElement>(options: UseFadeInOptions = {}) {
  const { once = true, root = null, rootMargin = '0px', threshold = 0.2 } = options;

  const targetRef = ref<T | null>(null) as Ref<T | null>;
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  const disconnect = () => {
    observer?.disconnect();
    observer = null;
  };

  watch(
    targetRef,
    (element) => {
      disconnect();

      if (!element) {
        return;
      }

      if (typeof IntersectionObserver === 'undefined') {
        isVisible.value = true;
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const currentEntry = entries[0];
          if (!currentEntry) {
            return;
          }

          if (currentEntry.isIntersecting) {
            isVisible.value = true;
            if (once) {
              disconnect();
            }
            return;
          }

          if (!once) {
            isVisible.value = false;
          }
        },
        {
          root,
          rootMargin,
          threshold,
        },
      );

      observer.observe(element);
    },
    { flush: 'post' },
  );

  onBeforeUnmount(() => {
    disconnect();
  });

  return {
    targetRef,
    isVisible,
    disconnect,
  };
}
