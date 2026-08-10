import { mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeatureStoryMotion } from '../useFeatureStoryMotion';

function mockElement(top: number): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      top,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }),
  } as HTMLElement;
}

function mountMotion(options: { reducedMotion?: () => boolean } = {}) {
  const rootRef = shallowRef<HTMLElement | null>(mockElement(720));
  let motion!: ReturnType<typeof useFeatureStoryMotion>;

  const wrapper = mount(
    defineComponent({
      setup() {
        motion = useFeatureStoryMotion({
          rootRef,
          featureCount: 4,
          exitDuration: 180,
          enterDuration: 320,
          reducedMotion: options.reducedMotion,
        });
        return () => h('div');
      },
    }),
  );

  return { motion, rootRef, wrapper };
}

describe('useFeatureStoryMotion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clamps the centered-to-left entrance progress to the story range', () => {
    const { motion, rootRef, wrapper } = mountMotion();

    rootRef.value = mockElement(900);
    motion.syncFromScroll();
    expect(motion.introProgress.value).toBe(0);

    rootRef.value = mockElement(430);
    motion.syncFromScroll();
    expect(motion.introProgress.value).toBeCloseTo(0.5, 4);

    rootRef.value = mockElement(-200);
    motion.syncFromScroll();
    expect(motion.introProgress.value).toBe(1);

    wrapper.unmount();
  });

  it('requests the latest narrative that crossed the viewport activation line', () => {
    const { motion, wrapper } = mountMotion();
    motion.setStepRef(0, mockElement(-800));
    motion.setStepRef(1, mockElement(400));
    motion.setStepRef(2, mockElement(1300));
    motion.setStepRef(3, mockElement(2200));

    motion.syncFromScroll();

    expect(motion.requestedIndex.value).toBe(1);
    expect(motion.phase.value).toBe('leaving');
    wrapper.unmount();
  });

  it('completes leave, swap, and enter phases independently of scroll', () => {
    const { motion, wrapper } = mountMotion();

    motion.requestFeature(2);
    expect(motion.phase.value).toBe('leaving');
    expect(motion.renderedIndex.value).toBe(0);

    vi.advanceTimersByTime(180);
    expect(motion.phase.value).toBe('entering');
    expect(motion.renderedIndex.value).toBe(2);

    vi.advanceTimersByTime(320);
    expect(motion.phase.value).toBe('idle');
    expect(motion.renderedIndex.value).toBe(2);
    wrapper.unmount();
  });

  it('uses the latest requested feature when rapid scrolling crosses multiple steps', () => {
    const { motion, wrapper } = mountMotion();

    motion.requestFeature(1);
    motion.requestFeature(3);
    vi.advanceTimersByTime(180);

    expect(motion.renderedIndex.value).toBe(3);
    expect(motion.phase.value).toBe('entering');
    vi.advanceTimersByTime(320);
    expect(motion.phase.value).toBe('idle');
    wrapper.unmount();
  });

  it('swaps immediately when reduced motion is requested', () => {
    const { motion, wrapper } = mountMotion({ reducedMotion: () => true });

    motion.requestFeature(3);

    expect(motion.requestedIndex.value).toBe(3);
    expect(motion.renderedIndex.value).toBe(3);
    expect(motion.phase.value).toBe('idle');
    wrapper.unmount();
  });

  it('removes global listeners and pending work when unmounted', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const { motion, wrapper } = mountMotion();
    motion.requestFeature(2);

    wrapper.unmount();

    expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(cancelAnimationFrame).toHaveBeenCalled();
    vi.runAllTimers();
  });
});
