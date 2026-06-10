import { describe, expect, it, vi } from 'vitest';

import { articleKeys, articleListInfiniteOptions, normalizeArticleListParams } from '@/composables/useArticleList';
import { getList } from '@/service/article/article.request';

vi.mock('@/service/article/article.request', () => ({
  getList: vi.fn(),
  likeArticle: vi.fn(),
}));

vi.mock('@/service/user/user.request', () => ({
  getLiked: vi.fn(),
}));

vi.mock('@/utils', () => ({
  Msg: {
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showFail: vi.fn(),
  },
}));

describe('article list query options', () => {
  it('uses one normalized parameter object for its key and request', async () => {
    vi.mocked(getList).mockResolvedValue({
      code: 0,
      data: {
        result: [{ id: 21 }],
        total: 3,
      },
    } as never);

    const normalized = normalizeArticleListParams({
      userId: 7,
      pageOrder: 'date',
      keywords: '',
      pageSize: 2,
    });
    const options = articleListInfiniteOptions(normalized);
    const signal = new AbortController().signal;

    expect(options.queryKey).toEqual(articleKeys.list(normalized));

    if (typeof options.queryFn !== 'function') {
      throw new Error('Expected article queryFn to be callable');
    }
    const page = await options.queryFn({
      pageParam: 2,
      signal,
      queryKey: options.queryKey,
      direction: 'forward',
      meta: undefined,
      client: undefined,
    } as never);

    expect(getList).toHaveBeenCalledWith(
      {
        ...normalized,
        pageNum: 2,
      },
      undefined,
      signal,
    );
    expect(page.result).toEqual([{ id: 21 }]);
  });

  it('returns the next page only while the loaded item count is below total', () => {
    const options = articleListInfiniteOptions(normalizeArticleListParams({ pageSize: 2 }));
    const firstPage = { result: [{ id: 1 }, { id: 2 }], total: 3 };
    const lastPage = { result: [{ id: 3 }], total: 3 };

    expect(options.getNextPageParam(firstPage, [firstPage], 1, [1])).toBe(2);
    expect(options.getNextPageParam(lastPage, [firstPage, lastPage], 2, [1, 2])).toBeUndefined();
    expect(articleKeys.lists()).toEqual(['articles', 'list']);
  });
});
