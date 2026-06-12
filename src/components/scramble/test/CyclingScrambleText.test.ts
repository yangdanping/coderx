import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseScrambleOptions } from '@scrambl/vue';

const scramblMock = vi.hoisted(() => ({
  useScramble: vi.fn(),
}));

vi.mock('@scrambl/vue', () => ({
  useScramble: scramblMock.useScramble,
}));

import CyclingScrambleText from '../CyclingScrambleText.vue';

function stubReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('CyclingScrambleText', () => {
  const capturedOptions: UseScrambleOptions[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
    capturedOptions.length = 0;
    scramblMock.useScramble.mockReset();
    scramblMock.useScramble.mockImplementation((options: UseScrambleOptions) => {
      capturedOptions.push(options);

      return {
        ref: ref<HTMLElement | null>(null),
        replay: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        isPlaying: ref(false),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('waits for completion and then the full cycle delay before changing words', async () => {
    mount(CyclingScrambleText, {
      props: {
        words: ['Coder', 'Writer', 'Creator'],
        cycleDelay: 2000,
      },
    });

    expect(capturedOptions.map((options) => options.text)).toEqual(['Coder']);

    await vi.advanceTimersByTimeAsync(5000);
    expect(capturedOptions.map((options) => options.text)).toEqual(['Coder']);

    capturedOptions[0]?.onComplete?.();
    await vi.advanceTimersByTimeAsync(1999);
    expect(capturedOptions.map((options) => options.text)).toEqual(['Coder']);

    await vi.advanceTimersByTimeAsync(1);
    await nextTick();
    expect(capturedOptions.map((options) => options.text)).toEqual(['Coder', 'Writer']);

    capturedOptions[1]?.onComplete?.();
    await vi.advanceTimersByTimeAsync(2000);
    await nextTick();
    expect(capturedOptions.map((options) => options.text)).toEqual(['Coder', 'Writer', 'Creator']);
  });

  it('lets explicit official props override the selected preset', () => {
    const inViewOptions = { threshold: 0.75 };

    mount(CyclingScrambleText, {
      props: {
        words: ['Coder', 'Writer'],
        preset: 'terminalBinary',
        duration: 1500,
        from: 'right',
        trigger: 'inView',
        playOnMount: false,
        inViewOptions,
      },
    });

    expect(capturedOptions[0]).toMatchObject({
      text: 'Coder',
      chars: 'binary',
      duration: 1500,
      from: 'right',
      renderMode: 'cells',
      trigger: 'inView',
      playOnMount: false,
      inViewOptions,
    });
  });

  it('uses text as a single-word fallback and does not schedule another animation', async () => {
    mount(CyclingScrambleText, {
      props: {
        words: [],
        text: 'Solo',
        cycleDelay: 100,
      },
    });

    expect(capturedOptions[0]?.text).toBe('Solo');
    capturedOptions[0]?.onComplete?.();
    await vi.advanceTimersByTimeAsync(100);
    expect(capturedOptions).toHaveLength(1);
  });

  it('clears a pending cycle when unmounted', async () => {
    const wrapper = mount(CyclingScrambleText, {
      props: {
        words: ['Coder', 'Writer'],
        cycleDelay: 2000,
      },
    });

    capturedOptions[0]?.onComplete?.();
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(2000);

    expect(capturedOptions).toHaveLength(1);
  });

  it('renders static text and skips animation when reduced motion is requested', () => {
    stubReducedMotion(true);

    const wrapper = mount(CyclingScrambleText, {
      props: {
        as: 'strong',
        words: ['Coder', 'Writer'],
      },
    });

    expect(scramblMock.useScramble).not.toHaveBeenCalled();
    expect(wrapper.element.tagName).toBe('STRONG');
    expect(wrapper.text()).toBe('Coder');
  });
});
