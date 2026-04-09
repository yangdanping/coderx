import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useFadeIn } from './useFadeIn';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
}

describe('useFadeIn', () => {
  it('marks the target visible after the observer reports an intersection', async () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);

    const Harness = defineComponent({
      setup() {
        const { targetRef, isVisible } = useFadeIn();
        return () => h('div', [h('div', { ref: targetRef }), h('span', isVisible.value ? 'visible' : 'hidden')]);
      },
    });

    const wrapper = mount(Harness);
    await wrapper.vm.$nextTick();
    const observer = MockIntersectionObserver.instances.at(-1);

    expect(observer?.observe).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('hidden');

    observer?.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('visible');
    expect(observer?.disconnect).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    vi.unstubAllGlobals();
    MockIntersectionObserver.instances.length = 0;
  });

  it('falls back to visible when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const Harness = defineComponent({
      setup() {
        const { targetRef, isVisible } = useFadeIn();
        return () => h('div', [h('div', { ref: targetRef }), h('span', isVisible.value ? 'visible' : 'hidden')]);
      },
    });

    const wrapper = mount(Harness);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('visible');

    wrapper.unmount();
    vi.unstubAllGlobals();
  });
});
