import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMockInstance = () => ({
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
  request: vi.fn(),
});

const { axiosCreate, loadingStore } = vi.hoisted(() => ({
  axiosCreate: vi.fn(),
  loadingStore: {
    start: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

vi.mock('@/stores/loading.store', () => ({
  default: vi.fn(() => loadingStore),
}));

import MyRequest from '../index';

describe('MyRequest', () => {
  beforeEach(() => {
    axiosCreate.mockReset();
    loadingStore.start.mockReset();
    loadingStore.end.mockReset();
  });

  it('stops keyed loading and returns response data from the global success interceptor', () => {
    const instance = createMockInstance();
    axiosCreate.mockReturnValue(instance);

    new MyRequest({
      baseURL: '/api',
    });

    const successInterceptor = instance.interceptors.response.use.mock.calls[1]?.[0];
    const result = successInterceptor({
      config: { loadingKey: 'article.list' },
      data: { code: 0, data: ['ok'] },
    });

    expect(loadingStore.end).toHaveBeenCalledWith('article.list');
    expect(result).toEqual({ code: 0, data: ['ok'] });
  });

  it('rejects response errors after cleaning up loading state', async () => {
    const instance = createMockInstance();
    axiosCreate.mockReturnValue(instance);

    new MyRequest({
      baseURL: '/api',
    });

    const error = {
      config: { loadingKey: 'article.list' },
      response: { status: 500 },
    };
    const errorInterceptor = instance.interceptors.response.use.mock.calls[1]?.[1];

    await expect(errorInterceptor(error)).rejects.toBe(error);
    expect(loadingStore.end).toHaveBeenCalledWith('article.list');
  });
});
