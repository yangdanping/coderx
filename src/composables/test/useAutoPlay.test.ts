import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useAutoPlay } from '../useAutoPlay';

describe('useAutoPlay', () => {
  it('restarts the play callback after each loop delay', async () => {
    vi.useFakeTimers();

    const calls: number[] = [];
    const { start, stop } = useAutoPlay({ loopDelay: 200 });

    start(async ({ sleep }) => {
      calls.push(calls.length + 1);
      await sleep(100);
    });

    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(calls).toEqual([1]);

    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(calls).toEqual([1, 2]);

    stop();
    vi.useRealTimers();
  });

  it('stops scheduling new loops after stop is called', async () => {
    vi.useFakeTimers();

    let calls = 0;
    const { start, stop, isActive } = useAutoPlay({ loopDelay: 300 });

    start(async ({ sleep }) => {
      calls += 1;
      await sleep(100);
    });

    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(calls).toBe(1);

    stop();
    await nextTick();
    expect(isActive.value).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(calls).toBe(1);

    vi.useRealTimers();
  });
});
