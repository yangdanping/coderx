import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { requestConfigs, showFailMock, showWarnMock, logOutMock } = vi.hoisted(() => ({
  requestConfigs: [] as Array<{ interceptors: { resFail: (error: unknown) => Promise<never> } }>,
  showFailMock: vi.fn(),
  showWarnMock: vi.fn(),
  logOutMock: vi.fn(),
}));

vi.mock('@/global/request', () => ({
  default: class MyRequestMock {
    constructor(config: { interceptors: { resFail: (error: unknown) => Promise<never> } }) {
      requestConfigs.push(config);
    }
  },
}));

vi.mock('@/utils', () => ({
  LocalCache: { getCache: vi.fn() },
  Msg: {
    showFail: showFailMock,
    showWarn: showWarnMock,
  },
}));

vi.mock('@/global/request/config', () => ({
  BASE_URL: '/api',
  NEWS_BASE_URL: '/news',
  TIME_OUT: 1000,
}));

vi.mock('@/stores/user.store', () => ({
  default: () => ({ logOut: logOutMock }),
}));

import '@/service';

describe('service error notifications', () => {
  beforeEach(() => {
    showFailMock.mockReset();
    showWarnMock.mockReset();
    logOutMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets an endpoint own its error message when showError is false', async () => {
    const error = {
      config: { method: 'get', url: '/article/random/toc', showError: false },
      response: { status: 404, data: { code: 404, msg: '暂无可体验目录的文章' } },
    };

    await expect(requestConfigs[0]!.interceptors.resFail(error)).rejects.toBe(error);

    expect(showFailMock).not.toHaveBeenCalled();
    expect(showWarnMock).not.toHaveBeenCalled();
  });

  it('keeps the shared fallback for requests without an override', async () => {
    const error = {
      config: { method: 'get', url: '/article' },
      response: { status: 500, data: { code: 500, msg: 'database unavailable' } },
    };

    await expect(requestConfigs[0]!.interceptors.resFail(error)).rejects.toBe(error);

    expect(showFailMock).toHaveBeenCalledWith('操作失败，请稍后重试');
  });
});
