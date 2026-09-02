import { mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateFeatureAmbientProgress, useFeatureAmbientDimming } from '../useFeatureAmbientDimming';

function mockElement(top: number, bottom: number): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      top,
      right: 0,
      bottom,
      left: 0,
      width: 0,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }),
  } as HTMLElement;
}

function mountAmbient(rootRef = shallowRef<HTMLElement | null>(mockElement(1020, 5000))) {
  let ambient!: ReturnType<typeof useFeatureAmbientDimming>;
  const wrapper = mount(
    defineComponent({
      setup() {
        ambient = useFeatureAmbientDimming({ rootRef });
        return () => h('div');
      },
    }),
  );

  return { ambient, rootRef, wrapper };
}

describe('calculateFeatureAmbientProgress', () => {
  it('moves from light to dark across the feature entry range', () => {
    expect(calculateFeatureAmbientProgress({ top: 1020, bottom: 5000 }, 1000)).toBe(0);
    expect(calculateFeatureAmbientProgress({ top: 600, bottom: 5000 }, 1000)).toBeCloseTo(0.5, 4);
    expect(calculateFeatureAmbientProgress({ top: 180, bottom: 5000 }, 1000)).toBe(1);
  });

  it('keeps the feature dark through its reading plateau', () => {
    expect(calculateFeatureAmbientProgress({ top: -1800, bottom: 1800 }, 1000)).toBe(1);
  });

  it('returns to light while the feature leaves toward hot authors', () => {
    expect(calculateFeatureAmbientProgress({ top: -3000, bottom: 600 }, 1000)).toBeCloseTo(0.5, 4);
    expect(calculateFeatureAmbientProgress({ top: -4000, bottom: 280 }, 1000)).toBe(0);
  });

  it('is stateless and reverses when the user scrolls upward', () => {
    const leavingProgress = calculateFeatureAmbientProgress({ top: -3000, bottom: 600 }, 1000);
    const reversedProgress = calculateFeatureAmbientProgress({ top: -1800, bottom: 1800 }, 1000);

    expect(leavingProgress).toBeCloseTo(0.5, 4);
    expect(reversedProgress).toBe(1);
  });
});

describe('useFeatureAmbientDimming', () => {
  const queuedFrames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;

  beforeEach(() => {
    queuedFrames.clear();
    nextFrameId = 1;
    document.documentElement.style.removeProperty('--home-feature-ambient-progress');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const frameId = nextFrameId++;
        queuedFrames.set(frameId, callback);
        return frameId;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frameId: number) => {
        queuedFrames.delete(frameId);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function runFrame(frameId: number) {
    const callback = queuedFrames.get(frameId);
    queuedFrames.delete(frameId);
    callback?.(0);
  }

  it('throttles scroll measurements to one animation frame', () => {
    const { ambient, rootRef, wrapper } = mountAmbient();

    rootRef.value = mockElement(180, 5000);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    runFrame(1);
    expect(ambient.progress.value).toBe(1);

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('publishes the ambient progress for app-level consumers and cleans it up on unmount', () => {
    const { wrapper } = mountAmbient(shallowRef<HTMLElement | null>(mockElement(180, 5000)));

    runFrame(1);
    expect(document.documentElement.style.getPropertyValue('--home-feature-ambient-progress')).toBe('1.0000');

    wrapper.unmount();
    expect(document.documentElement.style.getPropertyValue('--home-feature-ambient-progress')).toBe('');
  });

  it('removes global listeners and cancels pending work on unmount', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const { wrapper } = mountAmbient();

    wrapper.unmount();

    expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
