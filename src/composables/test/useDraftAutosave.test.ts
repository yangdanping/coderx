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

    const save = vi
      .fn<({ title: string }) => Promise<{ ok: true }>>()
      .mockRejectedValueOnce(new Error('conflict'))
      .mockResolvedValue({ ok: true });

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
});
