import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import VueDOMPurifyHTML from 'vue-dompurify-html';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FlowDetail from '../FlowDetail.vue';
import type { FlowItem } from '@/service/flow/flow.types';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/service', () => ({ default: { get: getMock } }));

function makeItem(id: number): FlowItem {
  return {
    id,
    author: { id: 7, name: '林墨', username: 'linmo', avatarUrl: '/avatar.svg' },
    body: `动态 ${id}`,
    bodyHtml: `<p>动态 ${id}</p>`,
    media: [],
    likes: 0,
    comments: 0,
    liked: false,
    createdAt: '2026-09-30T01:00:00.000Z',
  };
}

function responseFor(id: number) {
  return { code: 0, data: makeItem(id) };
}

function deferred() {
  let resolve!: (response: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<unknown>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const wrappers: VueWrapper[] = [];
const vueErrors = vi.fn();

async function mountDetail(flowId = '42') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/flow', component: { template: '<div />' } },
      { name: 'flow-detail', path: '/flow/:flowId', component: { template: '<div />' } },
    ],
  });
  await router.push(`/flow/${flowId || 'invalid'}`);
  await router.isReady();

  const wrapper = mount(FlowDetail, {
    props: { flowId },
    global: {
      plugins: [router, VueDOMPurifyHTML],
      stubs: { ElAvatar: true, FlowMediaGallery: true },
      config: { errorHandler: vueErrors },
    },
  });
  wrappers.push(wrapper);
  return { wrapper, router };
}

describe('FlowDetail request lifecycle', () => {
  beforeEach(() => {
    getMock.mockReset();
    vueErrors.mockClear();
  });

  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  });

  it('ends loading with a visible error and lets a retry display the detail', async () => {
    const initialRequest = deferred();
    const retryRequest = deferred();
    getMock.mockReturnValueOnce(initialRequest.promise).mockReturnValueOnce(retryRequest.promise);
    const { wrapper } = await mountDetail();

    expect(wrapper.find('.flow-skeleton-list').exists()).toBe(true);
    initialRequest.reject(new Error('network unavailable'));
    await flushPromises();

    expect(wrapper.find('.flow-skeleton-list').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('动态加载失败，请重试');
    expect(wrapper.find('.detail-empty').exists()).toBe(false);

    await wrapper.get('[role="alert"] button').trigger('click');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('.flow-skeleton-list').exists()).toBe(true);
    retryRequest.resolve(responseFor(42));
    await flushPromises();

    expect(wrapper.get('.item-body').text()).toBe('动态 42');
    expect(wrapper.find('.flow-skeleton-list').exists()).toBe(false);
    expect(wrapper.find('.item-detail-link').exists()).toBe(false);
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(vueErrors).not.toHaveBeenCalled();
  });

  it.each(['', '0', '-1', '1.5', 'bad-id', '9007199254740992', 'Infinity', 'NaN', '1e2', '0x2', '+2', ' 2 ', '2.0'])(
    'shows not found without requesting an invalid ID %j',
    async (flowId) => {
      getMock.mockResolvedValue(responseFor(42));
      const { wrapper } = await mountDetail(flowId);
      await flushPromises();

      expect(wrapper.find('.flow-skeleton-list').exists()).toBe(false);
      expect(wrapper.get('.detail-empty').text()).toContain('这条动态不存在或已被移除。');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(getMock).not.toHaveBeenCalled();
      expect(vueErrors).not.toHaveBeenCalled();
    },
  );

  it('shows not found for an HTTP 404 mapped to null and retains the return link', async () => {
    getMock.mockRejectedValueOnce({ response: { status: 404 } });
    const { wrapper, router } = await mountDetail();
    await flushPromises();

    expect(wrapper.find('.flow-skeleton-list').exists()).toBe(false);
    expect(wrapper.get('.detail-empty').text()).toContain('这条动态不存在或已被移除。');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    await wrapper.get('.detail-empty button').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/flow');
  });

  it('does not let an old success replace a newer detail in the same component', async () => {
    const oldRequest = deferred();
    const currentRequest = deferred();
    getMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(currentRequest.promise);
    const { wrapper } = await mountDetail('41');
    await wrapper.setProps({ flowId: '42' });

    currentRequest.resolve(responseFor(42));
    await flushPromises();
    expect(wrapper.get('.item-body').text()).toBe('动态 42');
    oldRequest.resolve(responseFor(41));
    await flushPromises();

    expect(wrapper.get('.item-body').text()).toBe('动态 42');
    expect(getMock.mock.calls.map(([config]) => config.url)).toEqual(['/flow/41', '/flow/42']);
  });

  it('keeps loading the latest ID when an earlier request succeeds first', async () => {
    const oldRequest = deferred();
    const currentRequest = deferred();
    getMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(currentRequest.promise);
    const { wrapper } = await mountDetail('41');
    await wrapper.setProps({ flowId: '42' });

    oldRequest.resolve(responseFor(41));
    await flushPromises();
    expect(wrapper.find('.flow-skeleton-list').exists()).toBe(true);
    expect(wrapper.find('.item-body').exists()).toBe(false);
    currentRequest.resolve(responseFor(42));
    await flushPromises();
    expect(wrapper.get('.item-body').text()).toBe('动态 42');
  });

  it('ignores an old failure after the latest ID has succeeded', async () => {
    const oldRequest = deferred();
    getMock.mockReturnValueOnce(oldRequest.promise).mockResolvedValueOnce(responseFor(42));
    const { wrapper } = await mountDetail('41');
    await wrapper.setProps({ flowId: '42' });
    await flushPromises();

    oldRequest.reject(new Error('old request failed'));
    await flushPromises();

    expect(wrapper.get('.item-body').text()).toBe('动态 42');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(vueErrors).not.toHaveBeenCalled();
  });

  it('ignores an old success after the latest ID has failed', async () => {
    const oldRequest = deferred();
    getMock.mockReturnValueOnce(oldRequest.promise).mockRejectedValueOnce(new Error('current request failed'));
    const { wrapper } = await mountDetail('41');
    await wrapper.setProps({ flowId: '42' });
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('动态加载失败，请重试');
    oldRequest.resolve(responseFor(41));
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('动态加载失败，请重试');
    expect(wrapper.find('.item-body').exists()).toBe(false);
    expect(vueErrors).not.toHaveBeenCalled();
  });

  it('ignores an outstanding response after switching to an invalid ID', async () => {
    const oldRequest = deferred();
    getMock.mockReturnValueOnce(oldRequest.promise);
    const { wrapper } = await mountDetail();
    await wrapper.setProps({ flowId: 'invalid' });
    await flushPromises();
    oldRequest.resolve(responseFor(42));
    await flushPromises();

    expect(wrapper.get('.detail-empty').text()).toContain('这条动态不存在或已被移除。');
    expect(wrapper.find('.item-body').exists()).toBe(false);
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(vueErrors).not.toHaveBeenCalled();
  });

  it.each(['success', 'failure'] as const)('does not update detail state after unmount on %s', async (outcome) => {
    const request = deferred();
    getMock.mockReturnValueOnce(request.promise);
    const { wrapper } = await mountDetail();
    const state = wrapper.vm as unknown as { item: FlowItem | null; loading: boolean };
    wrapper.unmount();
    const beforeResponse = { item: state.item, loading: state.loading };

    if (outcome === 'success') request.resolve(responseFor(42));
    else request.reject(new Error('request failed after unmount'));
    await flushPromises();

    expect({ item: state.item, loading: state.loading }).toEqual(beforeResponse);
    expect(vueErrors).not.toHaveBeenCalled();
  });
});
