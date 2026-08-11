import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { createDraftSaveScheduler } from '../useDraftAutosave';

describe('createDraftSaveScheduler', () => {
  it('debounces rapid changes and only saves the latest snapshot', async () => {
    vi.useFakeTimers();

    const savedSnapshots: Array<{ title: string }> = [];
    const scheduler = createDraftSaveScheduler({
      debounceMs: 200,
      save: async (snapshot) => {
        savedSnapshots.push(snapshot);
        return { ok: true };
      },
    });

    scheduler.schedule({ title: 'first' });
    scheduler.schedule({ title: 'latest' });

    await vi.advanceTimersByTimeAsync(199);
    await flushPromises();
    expect(savedSnapshots).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(savedSnapshots).toEqual([{ title: 'latest' }]);

    scheduler.dispose();
    vi.useRealTimers();
  });

  it('runs the newest queued snapshot after the in-flight save finishes', async () => {
    vi.useFakeTimers();

    const saveCalls: Array<{ title: string }> = [];
    let resolveFirstSave: (() => void) | null = null;

    const scheduler = createDraftSaveScheduler({
      debounceMs: 100,
      save: (snapshot) => {
        saveCalls.push(snapshot);

        if (snapshot.title === 'first') {
          return new Promise<{ ok: true }>((resolve) => {
            resolveFirstSave = () => resolve({ ok: true });
          });
        }

        return Promise.resolve({ ok: true });
      },
    });

    scheduler.schedule({ title: 'first' });
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(saveCalls).toEqual([{ title: 'first' }]);

    scheduler.schedule({ title: 'second' });
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(saveCalls).toEqual([{ title: 'first' }]);

    resolveFirstSave?.();
    await flushPromises();
    expect(saveCalls).toEqual([{ title: 'first' }, { title: 'second' }]);

    scheduler.dispose();
    vi.useRealTimers();
  });

  it('stops scheduling new saves after a halted error such as conflict', async () => {
    vi.useFakeTimers();

    const save = vi.fn<({ title: string }) => Promise<{ ok: true }>>().mockRejectedValueOnce(new Error('conflict')).mockResolvedValue({ ok: true });

    const scheduler = createDraftSaveScheduler({
      debounceMs: 100,
      save,
      onError: () => 'halt',
    });

    scheduler.schedule({ title: 'first' });
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(save).toHaveBeenCalledTimes(1);

    scheduler.schedule({ title: 'second' });
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(save).toHaveBeenCalledTimes(1);

    scheduler.dispose();
    vi.useRealTimers();
  });

  it('resumes new saves only after an explicitly halted scheduler is idle', async () => {
    vi.useFakeTimers();

    const save = vi.fn<({ title: string }) => Promise<{ ok: true }>>().mockRejectedValueOnce(new Error('conflict')).mockResolvedValue({ ok: true });
    const scheduler = createDraftSaveScheduler({
      debounceMs: 100,
      save,
      onError: () => 'halt',
    });

    scheduler.schedule({ title: 'conflicted' });
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(scheduler.isHalted()).toBe(true);

    expect(scheduler.resume()).toBe(true);

    scheduler.schedule({ title: 'after-clear' });
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ title: 'after-clear' });

    scheduler.dispose();
    vi.useRealTimers();
  });

  it('waits for an in-flight save before reporting idle', async () => {
    let finishSave!: () => void;
    const scheduler = createDraftSaveScheduler({
      debounceMs: 0,
      save: () =>
        new Promise<{ ok: true }>((resolve) => {
          finishSave = () => resolve({ ok: true });
        }),
    });

    scheduler.schedule({ body: 'draft' });
    const flushPromise = scheduler.flush();
    await flushPromises();

    let idle = false;
    void scheduler.waitForIdle().then(() => {
      idle = true;
    });
    await flushPromises();
    expect(idle).toBe(false);

    finishSave();
    await flushPromise;
    await flushPromises();
    expect(idle).toBe(true);

    scheduler.dispose();
  });
});
