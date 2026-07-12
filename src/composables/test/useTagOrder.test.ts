import { describe, expect, it, vi } from 'vitest';

import { useTagOrder } from '@/composables/useTagOrder';
import type { Itag } from '@/stores/types/article.result';

const tags: Itag[] = [
  { id: 1, name: '前端' },
  { id: 2, name: '后端' },
  { id: 3, name: 'JS/TS' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useTagOrder', () => {
  it('optimistically reorders and commits the server-normalized response', async () => {
    const request = deferred<{ code: number; data: Itag[] }>();
    const saveOrder = vi.fn(() => request.promise);
    const { orderedTags, isSaving, syncTags, reorderAndSave } = useTagOrder({ saveOrder });
    syncTags(tags);

    const pending = reorderAndSave(2, 0);

    expect(orderedTags.value.map((tag) => tag.id)).toEqual([3, 1, 2]);
    expect(isSaving.value).toBe(true);
    expect(saveOrder).toHaveBeenCalledWith([3, 1, 2]);

    request.resolve({
      code: 0,
      data: [
        { id: 3, name: 'JS/TS' },
        { id: 1, name: '前端' },
        { id: 2, name: '后端' },
      ],
    });

    await expect(pending).resolves.toBe(true);
    expect(isSaving.value).toBe(false);
    expect(orderedTags.value.map((tag) => tag.id)).toEqual([3, 1, 2]);
  });

  it('rolls back to the last committed order when the request rejects', async () => {
    const onSaveError = vi.fn();
    const saveOrder = vi.fn().mockRejectedValue(new Error('network failed'));
    const { orderedTags, syncTags, reorderAndSave } = useTagOrder({ saveOrder, onSaveError });
    syncTags(tags);

    await expect(reorderAndSave(0, 2)).resolves.toBe(false);

    expect(orderedTags.value.map((tag) => tag.id)).toEqual([1, 2, 3]);
    expect(onSaveError).toHaveBeenCalledOnce();
  });

  it('treats an application error response as a failed save and rolls back', async () => {
    const onSaveError = vi.fn();
    const saveOrder = vi.fn().mockResolvedValue({ code: -1, msg: 'failed' });
    const { orderedTags, syncTags, reorderAndSave } = useTagOrder({ saveOrder, onSaveError });
    syncTags(tags);

    await expect(reorderAndSave(0, 1)).resolves.toBe(false);

    expect(orderedTags.value.map((tag) => tag.id)).toEqual([1, 2, 3]);
    expect(onSaveError).toHaveBeenCalledOnce();
  });

  it('locks additional reorder attempts while one save is pending', async () => {
    const request = deferred<{ code: number; data: Itag[] }>();
    const saveOrder = vi.fn(() => request.promise);
    const { orderedTags, syncTags, reorderAndSave } = useTagOrder({ saveOrder });
    syncTags(tags);

    const first = reorderAndSave(0, 2);
    await expect(reorderAndSave(0, 1)).resolves.toBe(false);
    expect(saveOrder).toHaveBeenCalledTimes(1);
    expect(orderedTags.value.map((tag) => tag.id)).toEqual([2, 3, 1]);

    request.resolve({ code: 0, data: [...orderedTags.value] });
    await first;
  });
});
