import { mount } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseScrambleOptions } from '@scrambl/vue';

const scramblMock = vi.hoisted(() => ({
  useScramble: vi.fn(),
}));

vi.mock('@scrambl/vue', () => ({
  useScramble: scramblMock.useScramble,
}));

import ScrambleWord from '../ScrambleWord.vue';

describe('ScrambleWord', () => {
  let capturedOptions: UseScrambleOptions;
  let targetElementRef: Ref<HTMLElement | null>;

  beforeEach(() => {
    scramblMock.useScramble.mockReset();
    scramblMock.useScramble.mockImplementation((options: UseScrambleOptions) => {
      capturedOptions = options;
      targetElementRef = ref<HTMLElement | null>(null);

      return {
        ref: targetElementRef,
        replay: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        isPlaying: ref(false),
      };
    });
  });

  it('passes every official core and Vue option to useScramble', () => {
    const inViewOptions = { threshold: 0.5 };
    const easing = (progress: number) => progress;

    const wrapper = mount(ScrambleWord, {
      props: {
        as: 'strong',
        text: 'Writer',
        from: 'right',
        chars: 'binary',
        cursor: '_',
        duration: 1234,
        delay: 120,
        ease: easing,
        steps: 7,
        perturbation: 0.3,
        revealRate: 40,
        settleDuration: 80,
        settleRate: 10,
        reversed: true,
        override: 'Coder',
        fill: ' ',
        seed: 42,
        speed: 1.25,
        loop: 2,
        renderMode: 'text',
        trigger: 'inView',
        playOnMount: false,
        inViewOptions,
      },
    });

    expect(wrapper.element.tagName).toBe('STRONG');
    expect(targetElementRef.value).toBe(wrapper.element);
    expect(capturedOptions).toMatchObject({
      text: 'Writer',
      from: 'right',
      chars: 'binary',
      cursor: '_',
      duration: 1234,
      delay: 120,
      ease: easing,
      steps: 7,
      perturbation: 0.3,
      revealRate: 40,
      settleDuration: 80,
      settleRate: 10,
      reversed: true,
      override: 'Coder',
      fill: ' ',
      seed: 42,
      speed: 1.25,
      loop: 2,
      renderMode: 'text',
      trigger: 'inView',
      playOnMount: false,
      inViewOptions,
    });
  });

  it('invokes callback props and emits non-conflicting scramble lifecycle events', () => {
    const onStart = vi.fn();
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const wrapper = mount(ScrambleWord, {
      props: {
        text: 'Creator',
        onStart,
        onChange,
        onComplete,
      },
    });

    capturedOptions.onStart?.();
    capturedOptions.onChange?.('Cr▒ator', 0.6);
    capturedOptions.onComplete?.();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Cr▒ator', 0.6);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('scramble-start')).toHaveLength(1);
    expect(wrapper.emitted('scramble-change')).toEqual([['Cr▒ator', 0.6]]);
    expect(wrapper.emitted('scramble-complete')).toHaveLength(1);
  });
});
