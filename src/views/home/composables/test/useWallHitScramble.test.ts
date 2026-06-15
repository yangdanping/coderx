import type { CreateScramblerOptions, ScrambleInstance } from '@scrambl/core';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMock = vi.hoisted(() => ({
  createScrambler: vi.fn(),
}));

vi.mock('@scrambl/core', () => ({
  createScrambler: coreMock.createScrambler,
}));

import { useWallHitScramble } from '../useWallHitScramble';

interface ScramblerRecord {
  instance: ScrambleInstance;
  options: CreateScramblerOptions;
}

describe('useWallHitScramble', () => {
  const scramblers: ScramblerRecord[] = [];

  beforeEach(() => {
    scramblers.length = 0;
    coreMock.createScrambler.mockReset();
    coreMock.createScrambler.mockImplementation((options: CreateScramblerOptions) => {
      const instance: ScrambleInstance = {
        play: vi.fn(),
        pause: vi.fn(),
        restart: vi.fn(),
        destroy: vi.fn(),
        isPlaying: false,
        progress: 0,
      };

      scramblers.push({ instance, options });
      return instance;
    });

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mountComposable() {
    let composable!: ReturnType<typeof useWallHitScramble>;
    const wrapper = mount(
      defineComponent({
        setup() {
          composable = useWallHitScramble();
          return () => null;
        },
      }),
    );

    return { composable, wrapper };
  }

  it('initializes from blank text and completes on CoderX', async () => {
    const { composable } = mountComposable();
    const initialization = scramblers[0];

    expect(initialization.options).toMatchObject({
      fromText: '',
      text: 'CoderX',
    });
    expect(composable.isInitialized.value).toBe(false);

    initialization.options.onFrame?.('CoｱerX', 0.5);
    await nextTick();

    expect(composable.frame.value).toBe('CoｱerX');
    expect(composable.screenFrame.value).toBe('coｱerx');

    initialization.options.onComplete?.();
    await nextTick();

    expect(composable.frame.value).toBe('CoderX');
    expect(composable.target.value).toBe('CoderX');
    expect(composable.isInitialized.value).toBe(true);
  });

  it('ignores wall hits until the CoderX initialization completes', () => {
    const { composable } = mountComposable();

    composable.advanceOnWallHit();

    expect(coreMock.createScrambler).toHaveBeenCalledTimes(1);
    expect(composable.targetIndex.value).toBe(0);
    expect(composable.target.value).toBe('CoderX');
  });

  it('keeps CoderX on the first wall hit and advances on the second', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { composable } = mountComposable();

    expect(scramblers[0].options.chars).toBe('braille');

    scramblers[0].options.onComplete?.();
    await nextTick();
    composable.advanceOnWallHit();

    expect(coreMock.createScrambler).toHaveBeenCalledTimes(1);
    expect(composable.target.value).toBe('CoderX');
    expect(composable.frame.value).toBe('CoderX');

    composable.advanceOnWallHit();

    expect(scramblers[1].options).toMatchObject({
      chars: 'katakana',
      fromText: 'CoderX',
      text: 'WriterX',
    });

    scramblers[1].options.onComplete?.();
    await nextTick();
    composable.advanceOnWallHit();

    expect(scramblers[2].options).toMatchObject({
      fromText: 'WriterX',
      text: 'CreatorX',
    });
  });

  it('interrupts an active transition from its latest partial frame', async () => {
    const { composable } = mountComposable();

    scramblers[0].options.onComplete?.();
    await nextTick();
    composable.advanceOnWallHit();
    composable.advanceOnWallHit();
    scramblers[1].options.onFrame?.('WrｦterX', 0.45);
    await nextTick();

    composable.advanceOnWallHit();

    expect(scramblers[1].instance.destroy).toHaveBeenCalledTimes(1);
    expect(scramblers[2].options).toMatchObject({
      fromText: 'WrｦterX',
      text: 'CreatorX',
    });
  });

  it('ignores stale callbacks from an interrupted scrambler', async () => {
    const { composable } = mountComposable();

    scramblers[0].options.onComplete?.();
    await nextTick();
    composable.advanceOnWallHit();
    composable.advanceOnWallHit();
    scramblers[1].options.onFrame?.('WrｦterX', 0.45);
    await nextTick();
    composable.advanceOnWallHit();

    scramblers[1].options.onFrame?.('stale', 0.9);
    scramblers[1].options.onComplete?.();
    await nextTick();

    expect(composable.frame.value).toBe('WrｦterX');
    expect(composable.target.value).toBe('CreatorX');
  });

  it('destroys the active scrambler when unmounted', () => {
    const { wrapper } = mountComposable();

    wrapper.unmount();

    expect(scramblers[0].instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('uses completed words immediately when reduced motion is preferred', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    const { composable } = mountComposable();

    expect(coreMock.createScrambler).not.toHaveBeenCalled();
    expect(composable.frame.value).toBe('CoderX');
    expect(composable.isInitialized.value).toBe(true);

    composable.advanceOnWallHit();
    await nextTick();

    expect(composable.frame.value).toBe('CoderX');

    composable.advanceOnWallHit();
    await nextTick();

    expect(composable.frame.value).toBe('WriterX');
    expect(composable.screenFrame.value).toBe('writerx');
  });
});
