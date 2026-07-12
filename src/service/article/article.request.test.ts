import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock('@/service', () => ({
  default: requestMock,
}));

import { getTagOrder, saveTagOrder } from './article.request';

describe('tag order requests', () => {
  beforeEach(() => {
    requestMock.get.mockReset();
    requestMock.put.mockReset();
  });

  it('loads the authenticated user tag order', () => {
    getTagOrder();

    expect(requestMock.get).toHaveBeenCalledWith({ url: '/tag/order' });
  });

  it('replaces the complete authenticated user tag order', () => {
    saveTagOrder([3, 1, 2]);

    expect(requestMock.put).toHaveBeenCalledWith({
      url: '/tag/order',
      data: { tagIds: [3, 1, 2] },
    });
  });
});
