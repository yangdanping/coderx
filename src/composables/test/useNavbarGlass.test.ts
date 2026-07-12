import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { calculateNavbarGlassProgress, useNavbarGlass } from '@/composables/useNavbarGlass';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
  });
}

function installAnimationFrame() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancelAnimationFrame = vi.fn((id: number) => {
    callbacks.delete(id);
  });

  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

  return {
    cancelAnimationFrame,
    flush() {
      const queued = [...callbacks.entries()];
      callbacks.clear();
      queued.forEach(([, callback]) => callback(performance.now()));
    },
    requestAnimationFrame,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setScrollY(0);
});

describe('calculateNavbarGlassProgress', () => {
  it('clamps progress across the configured reveal range', () => {
    expect(calculateNavbarGlassProgress(0, 0, 96)).toBe(0);
    expect(calculateNavbarGlassProgress(48, 0, 96)).toBe(0.5);
    expect(calculateNavbarGlassProgress(96, 0, 96)).toBe(1);
    expect(calculateNavbarGlassProgress(200, 0, 96)).toBe(1);
  });

  it('supports delayed starts and normalizes invalid ranges', () => {
    expect(calculateNavbarGlassProgress(40, 40, 140)).toBe(0);
    expect(calculateNavbarGlassProgress(90, 40, 140)).toBe(0.5);
    expect(calculateNavbarGlassProgress(50, -20, 0)).toBe(1);
    expect(calculateNavbarGlassProgress(Number.NaN, 0, 96)).toBe(0);
  });
});

describe('useNavbarGlass', () => {
  it('initializes from scrollY and coalesces scroll updates into one animation frame', async () => {
    setScrollY(50);
    const animationFrame = installAnimationFrame();
    const start = shallowRef(0);
    const end = shallowRef(100);

    const Harness = defineComponent({
      setup() {
        const { progress } = useNavbarGlass({ start, end });
        return () => h('output', { class: 'progress' }, String(progress.value));
      },
    });

    const wrapper = mount(Harness);
    expect(wrapper.get('.progress').text()).toBe('0.5');

    setScrollY(75);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(animationFrame.requestAnimationFrame).toHaveBeenCalledTimes(1);

    animationFrame.flush();
    await nextTick();
    expect(wrapper.get('.progress').text()).toBe('0.75');

    start.value = 50;
    end.value = 100;
    await nextTick();
    expect(animationFrame.requestAnimationFrame).toHaveBeenCalledTimes(2);

    animationFrame.flush();
    await nextTick();
    expect(wrapper.get('.progress').text()).toBe('0.5');
  });

  it('removes its listener and cancels pending animation work on unmount', () => {
    const animationFrame = installAnimationFrame();
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    const Harness = defineComponent({
      setup() {
        useNavbarGlass({ start: 0, end: 96 });
        return () => h('div');
      },
    });

    const wrapper = mount(Harness);
    window.dispatchEvent(new Event('scroll'));
    wrapper.unmount();

    expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(animationFrame.cancelAnimationFrame).toHaveBeenCalledOnce();
  });
});
