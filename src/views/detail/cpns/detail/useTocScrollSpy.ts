import { computed, onMounted, onUnmounted, readonly, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';

import type { DetailTocTitle } from './types/detail-toc.type';

const DEFAULT_ACTIVATION_OFFSET = 120;
const DEFAULT_NAVIGATION_OFFSET = 100;
const DEFAULT_SCROLL_IDLE_MS = 140;

export interface UseTocScrollSpyOptions {
  titles: MaybeRefOrGetter<readonly DetailTocTitle[]>;
  activationOffset?: number;
  navigationOffset?: number;
  scrollIdleMs?: number;
}

export interface UseTocScrollSpyResult {
  activeId: ComputedRef<string>;
  observedId: Readonly<ShallowRef<string>>;
  pendingTargetId: Readonly<ShallowRef<string | null>>;
  scrollToHeading: (id: string) => void;
  syncActiveFromScroll: () => void;
}

export function useTocScrollSpy({
  titles,
  activationOffset = DEFAULT_ACTIVATION_OFFSET,
  navigationOffset = DEFAULT_NAVIGATION_OFFSET,
  scrollIdleMs = DEFAULT_SCROLL_IDLE_MS,
}: UseTocScrollSpyOptions): UseTocScrollSpyResult {
  const initialId = toValue(titles)[0]?.id ?? '';
  const observedId = shallowRef(initialId);
  const pendingTargetId = shallowRef<string | null>(null);
  const activeId = computed(() => pendingTargetId.value ?? observedId.value);
  let animationFrameId: number | null = null;
  let scrollIdleTimer: ReturnType<typeof setTimeout> | null = null;
  const interruptKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

  const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearScrollIdleTimer = () => {
    if (scrollIdleTimer === null) return;
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = null;
  };

  const syncActiveFromScroll = () => {
    const items = toValue(titles);
    let nextId = items[0]?.id ?? '';
    const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;

    if (atPageEnd) {
      nextId = [...items].reverse().find((item) => document.getElementById(item.id))?.id ?? nextId;
    } else {
      for (const item of items) {
        const heading = document.getElementById(item.id);
        if (heading && heading.getBoundingClientRect().top <= activationOffset) {
          nextId = item.id;
        }
      }
    }

    observedId.value = nextId;
  };

  const finishPendingNavigation = () => {
    clearScrollIdleTimer();
    syncActiveFromScroll();
    pendingTargetId.value = null;
  };

  const targetReached = () => {
    const id = pendingTargetId.value;
    if (!id) return false;
    const heading = document.getElementById(id);
    if (!heading) return true;
    const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
    return Math.abs(heading.getBoundingClientRect().top - navigationOffset) <= 2 || atPageEnd;
  };

  const onScroll = () => {
    if (animationFrameId !== null) return;
    animationFrameId = window.requestAnimationFrame(() => {
      animationFrameId = null;
      syncActiveFromScroll();
    });

    if (!pendingTargetId.value) return;
    if (targetReached()) {
      finishPendingNavigation();
      return;
    }

    clearScrollIdleTimer();
    scrollIdleTimer = setTimeout(finishPendingNavigation, scrollIdleMs);
  };

  const cancelPendingNavigation = () => {
    if (pendingTargetId.value) finishPendingNavigation();
  };

  const onScrollEnd = () => {
    if (pendingTargetId.value) finishPendingNavigation();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (interruptKeys.has(event.key)) cancelPendingNavigation();
  };

  const scrollToHeading = (id: string) => {
    const heading = document.getElementById(id);
    if (!heading) return;

    clearScrollIdleTimer();
    pendingTargetId.value = id;
    window.scrollTo({
      top: heading.getBoundingClientRect().top + window.scrollY - navigationOffset,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  onMounted(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', cancelPendingNavigation, { passive: true });
    window.addEventListener('touchstart', cancelPendingNavigation, { passive: true });
    window.addEventListener('keydown', onKeydown);
    if ('onscrollend' in document) document.addEventListener('scrollend', onScrollEnd, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', cancelPendingNavigation);
    window.removeEventListener('touchstart', cancelPendingNavigation);
    window.removeEventListener('keydown', onKeydown);
    if ('onscrollend' in document) document.removeEventListener('scrollend', onScrollEnd);
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    clearScrollIdleTimer();
  });

  watch(
    () => toValue(titles),
    (nextTitles) => {
      clearScrollIdleTimer();
      pendingTargetId.value = null;
      observedId.value = nextTitles[0]?.id ?? '';
    },
  );

  return {
    activeId,
    observedId: readonly(observedId),
    pendingTargetId: readonly(pendingTargetId),
    scrollToHeading,
    syncActiveFromScroll,
  };
}
