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

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

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

  it('keeps loading start and end paired to each request under interleaved false and true completion', async () => {
    const instance = createMockInstance();
    axiosCreate.mockReturnValue(instance);
    const request = new MyRequest({ baseURL: '/api' });
    const pending = new Map<string, ReturnType<typeof deferred<{ code: number }>>>();
    instance.request.mockImplementation((config: { url: string }) => {
      const requestInterceptor = instance.interceptors.request.use.mock.calls[1]?.[0];
      const responseInterceptor = instance.interceptors.response.use.mock.calls[1]?.[0];
      const finalConfig = requestInterceptor(config);
      const task = deferred<{ code: number }>();
      pending.set(config.url, task);
      return task.promise.then((data) => responseInterceptor({ config: finalConfig, data }));
    });

    const hiddenA = request.get({ url: '/hidden-a', loadingKey: 'hidden-a', showLoading: false });
    const visible = request.get({ url: '/visible', loadingKey: 'visible', showLoading: true });
    const hiddenB = request.get({ url: '/hidden-b', loadingKey: 'hidden-b', showLoading: false });

    expect(loadingStore.start.mock.calls).toEqual([['visible']]);

    pending.get('/visible')!.resolve({ code: 0 });
    await visible;
    pending.get('/hidden-a')!.resolve({ code: 0 });
    await hiddenA;
    pending.get('/hidden-b')!.resolve({ code: 0 });
    await hiddenB;

    expect(loadingStore.start.mock.calls).toEqual([['visible']]);
    expect(loadingStore.end.mock.calls).toEqual([['visible']]);
  });

  it('does not end loading for an error from a request that disabled it', async () => {
    const instance = createMockInstance();
    axiosCreate.mockReturnValue(instance);
    new MyRequest({ baseURL: '/api' });
    const error = {
      config: { loadingKey: 'hidden', showLoading: false },
      response: { status: 500 },
    };
    const errorInterceptor = instance.interceptors.response.use.mock.calls[1]?.[1];

    await expect(errorInterceptor(error)).rejects.toBe(error);
    expect(loadingStore.end).not.toHaveBeenCalled();
  });
});
