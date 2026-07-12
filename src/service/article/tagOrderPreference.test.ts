import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTags, saveTagOrder, readGuestTagOrder, clearGuestTagOrder } = vi.hoisted(() => ({
  getTags: vi.fn(),
  saveTagOrder: vi.fn(),
  readGuestTagOrder: vi.fn(),
  clearGuestTagOrder: vi.fn(),
}));

vi.mock('@/service/article/article.request', () => ({ getTags, saveTagOrder }));
vi.mock('@/utils/tagOrderPreference', () => ({
  readGuestTagOrder,
  clearGuestTagOrder,
  mergeTagsByPreference: (tags: Array<{ id: number }>, ids: number[]) => {
    const byId = new Map(tags.map((tag) => [tag.id, tag]));
    const preferred = ids.map((id) => byId.get(id)).filter(Boolean) as Array<{ id: number }>;
    const selected = new Set(preferred.map((tag) => tag.id));
    return [...preferred, ...tags.filter((tag) => !selected.has(tag.id))];
  },
}));

import { migrateGuestTagOrderToAccount } from './tagOrderPreference';

describe('migrateGuestTagOrderToAccount', () => {
  beforeEach(() => {
    getTags.mockReset();
    saveTagOrder.mockReset();
    readGuestTagOrder.mockReset();
    clearGuestTagOrder.mockReset();
  });

  it('does nothing when no guest order is cached', async () => {
    readGuestTagOrder.mockReturnValue([]);

    await expect(migrateGuestTagOrderToAccount()).resolves.toBe('none');
    expect(getTags).not.toHaveBeenCalled();
  });

  it('normalizes against current tags and clears the cache after a successful save', async () => {
    readGuestTagOrder.mockReturnValue([3, 999, 1]);
    getTags.mockResolvedValue({
      code: 0,
      data: [
        { id: 1, name: '前端' },
        { id: 2, name: '后端' },
        { id: 3, name: 'JS/TS' },
      ],
    });
    saveTagOrder.mockResolvedValue({ code: 0 });

    await expect(migrateGuestTagOrderToAccount()).resolves.toBe('migrated');
    expect(saveTagOrder).toHaveBeenCalledWith([3, 1, 2]);
    expect(clearGuestTagOrder).toHaveBeenCalledOnce();
  });

  it('keeps the local order when loading or saving fails', async () => {
    readGuestTagOrder.mockReturnValue([2, 1]);
    getTags.mockResolvedValue({
      code: 0,
      data: [
        { id: 1, name: '前端' },
        { id: 2, name: '后端' },
      ],
    });
    saveTagOrder.mockRejectedValue(new Error('offline'));

    await expect(migrateGuestTagOrderToAccount()).resolves.toBe('failed');
    expect(clearGuestTagOrder).not.toHaveBeenCalled();
  });
});
