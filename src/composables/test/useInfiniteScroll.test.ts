import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from '@/composables/useInfiniteScroll';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  static currentIsIntersecting: boolean | null = null;

  callback: IntersectionObserverCallback;
  observe = vi.fn(() => {
    if (MockIntersectionObserver.currentIsIntersecting === null) return;
    queueMicrotask(() => {
      this.callback(
        [{ isIntersecting: MockIntersectionObserver.currentIsIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  });
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
    MockIntersectionObserver.currentIsIntersecting = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('suppresses duplicate observer callbacks while loadMore is unresolved', async () => {
    let resolveLoad: (() => void) | undefined;
    const loadMore = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const wrapper = mount(
      defineComponent({
        setup() {
          const canLoadMore = ref(true);
          const isLoading = ref(false);
          const { infiniteSentinel } = useInfiniteScroll({ canLoadMore, isLoading, loadMore });
          return () => h('div', { ref: infiniteSentinel });
        },
      }),
    );

    await nextTick();
    const observer = MockIntersectionObserver.instances.at(-1);
    const entries = [{ isIntersecting: true } as IntersectionObserverEntry];
    observer?.callback(entries, observer as unknown as IntersectionObserver);
    observer?.callback(entries, observer as unknown as IntersectionObserver);

    expect(loadMore).toHaveBeenCalledTimes(1);

    resolveLoad?.();
    await nextTick();
    wrapper.unmount();
    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });

  it('loads when an intersecting sentinel becomes eligible after loading finishes', async () => {
    MockIntersectionObserver.currentIsIntersecting = true;
    const canLoadMore = ref(true);
    const isLoading = ref(true);
    const loadMore = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(
      defineComponent({
        setup() {
          const { infiniteSentinel } = useInfiniteScroll({ canLoadMore, isLoading, loadMore });
          return () => h('div', { ref: infiniteSentinel });
        },
      }),
    );

    await nextTick();
    await Promise.resolve();
    expect(loadMore).not.toHaveBeenCalled();

    isLoading.value = false;
    await nextTick();
    await Promise.resolve();

    expect(loadMore).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('does not create an observer when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    expect(() =>
      mount(
        defineComponent({
          setup() {
            const { infiniteSentinel } = useInfiniteScroll({
              canLoadMore: true,
              isLoading: false,
              loadMore: vi.fn(),
            });
            return () => h('div', { ref: infiniteSentinel });
          },
        }),
      ),
    ).not.toThrow();
  });
});
