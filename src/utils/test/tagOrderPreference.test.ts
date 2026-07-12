import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = new Map<string, unknown>();

vi.mock('@/utils', () => ({
  LocalCache: {
    getCache: (key: string) => cache.get(key),
    setCache: (key: string, value: unknown) => cache.set(key, value),
    removeCache: (key: string) => cache.delete(key),
  },
}));

import { TAG_ORDER_CACHE_KEY, clearGuestTagOrder, mergeTagsByPreference, readGuestTagOrder, writeGuestTagOrder } from '@/utils/tagOrderPreference';

const tags = [
  { id: 1, name: '前端' },
  { id: 2, name: '后端' },
  { id: 3, name: 'JS/TS' },
];

describe('tagOrderPreference', () => {
  beforeEach(() => cache.clear());

  it('normalizes cached ids to unique positive integers', () => {
    cache.set(TAG_ORDER_CACHE_KEY, [3, 3, -1, '2', 1.5, 1]);

    expect(readGuestTagOrder()).toEqual([3, 1]);
  });

  it('stores and clears a normalized guest order', () => {
    writeGuestTagOrder([2, 2, 1]);
    expect(readGuestTagOrder()).toEqual([2, 1]);

    clearGuestTagOrder();
    expect(readGuestTagOrder()).toEqual([]);
  });

  it('drops stale ids and appends newly-created tags in server order', () => {
    expect(mergeTagsByPreference(tags, [3, 999, 1])).toEqual([tags[2], tags[0], tags[1]]);
  });
});
