import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiServiceHealth } from './useAiServiceHealth';

const fetchMock = vi.fn<typeof fetch>();
const models = [
  { name: 'One', value: 'one' },
  { name: 'Two', value: 'two' },
];
let wrapper: VueWrapper;
let health: ReturnType<typeof useAiServiceHealth>;

function setup() {
  wrapper = mount({
    setup() {
      health = useAiServiceHealth({ token: () => 'test-token', savedModel: () => 'two' });
      return () => null;
    },
  });
}

describe('AI service health recovery lifecycle', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('times out and allows a fresh check, preserving the saved model and auth header', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    setup();
    await vi.advanceTimersByTimeAsync(5000);
    expect(health.status.value).toBe('offline');
    fetchMock.mockResolvedValueOnce(Response.json({ status: 'online', models }));
    await health.check();
    expect(health.status.value).toBe('online');
    expect(health.activeModel.value?.value).toBe('two');
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({ Authorization: 'test-token' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces repeated checks and cancels the request when unmounted', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    setup();
    await health.check();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    resolve(Response.json({ status: 'online', models }));
    await flushPromises();
    expect(health.status.value).not.toBe('online');
    await health.check();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats HTTP errors as offline and keeps a manually chosen model across rechecks', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    setup();
    await flushPromises();
    expect(health.status.value).toBe('offline');
    fetchMock.mockImplementation(async () => Response.json({ status: 'online', models }));
    await health.check();
    health.activeModel.value = models[0]!;
    await health.check();
    expect(health.activeModel.value?.value).toBe('one');
  });
});
