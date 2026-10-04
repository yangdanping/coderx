import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, watch } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { confirmMock, getDraftMock, saveDraftMock, discardMock, failMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(), getDraftMock: vi.fn(), saveDraftMock: vi.fn(), discardMock: vi.fn(), failMock: vi.fn(),
}));

vi.mock('@/service/flow/flow-draft.request', () => ({
  getFlowDraftRequest: getDraftMock, saveFlowDraftRequest: saveDraftMock, deleteFlowDraftRequest: vi.fn(),
}));
vi.mock('@/composables/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ pullDistance: shallowRef(0), isRefreshing: shallowRef(false) }),
}));
vi.mock('@/stores/user.store', () => ({ default: () => ({ userInfo: { id: 7 }, token: 'test-token' }) }));
vi.mock('element-plus', () => ({ ElMessageBox: { confirm: confirmMock } }));
vi.mock('@/utils', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/utils')>(),
  Msg: { showFail: failMock, showSuccess: vi.fn(), showWarn: vi.fn() },
}));

import Flow from '../Flow.vue';

const document = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '不能丢失的内容' }] }] };
const savedDraft = {
  id: 18, version: 1, draftType: 'flow', articleId: null, title: null, content: document,
  meta: { imageIds: [], videoIds: [] }, images: [], updateAt: '2026-09-30T02:00:00.000Z',
};
const emptyAttachments = {
  attachmentCount: 0, uploadedAssets: [], uploadedMediaIds: [], isUploading: false, isDeleting: false, hasFailed: false,
};
const wrappers: VueWrapper[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const Modal = defineComponent({
  name: 'FlowEditorModal',
  props: ['open', 'document', 'lifecycleLocked'],
  emits: ['close', 'after-close', 'update:json', 'update:publishing'],
  setup(props, { emit, expose }) {
    expose({ getAttachmentSnapshot: () => emptyAttachments, discardAttachments: discardMock, cleanupMediaIds: vi.fn() });
    watch(() => props.open, (open) => { if (!open) emit('after-close'); });
    return () => h('div', { 'data-testid': 'editor' }, JSON.stringify(props.document));
  },
});

async function mountNavigation() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/before', component: { render: () => h('p', 'before') } },
      { path: '/flow', component: Flow },
      { path: '/next', component: { render: () => h('p', 'next') } },
      { path: '/other', component: { render: () => h('p', 'other') } },
    ],
  });
  await router.push('/before');
  await router.push('/flow');
  const wrapper = mount({ render: () => h(RouterView) }, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } }) }]],
      stubs: { FlowEditorModal: Modal, FlowFeed: { template: '<div />' } },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

async function enterContent(wrapper: VueWrapper, open = true) {
  if (open) await wrapper.get('.flow-cord-handle').trigger('click');
  wrapper.getComponent(Modal).vm.$emit('update:json', document);
  await nextTick();
}

async function finishAnimation() {
  await flushPromises();
  await vi.advanceTimersByTimeAsync(450);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  confirmMock.mockReset().mockRejectedValue('close');
  getDraftMock.mockReset().mockResolvedValue({ data: null });
  saveDraftMock.mockReset().mockResolvedValue({ data: savedDraft });
  discardMock.mockReset().mockResolvedValue({ failedDeletes: 0 });
  failMock.mockReset();
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Flow route leave decisions', () => {
  it('waits past the cord animation deadline for a decision, then preserves content on cancel', async () => {
    const choice = deferred<void>();
    confirmMock.mockReturnValue(choice.promise);
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper);
    const navigation = router.push('/next');
    await finishAnimation();
    const remained = router.currentRoute.value.path;
    choice.reject('close');
    await finishAnimation();
    await navigation;

    expect(remained).toBe('/flow');
    expect(router.currentRoute.value.path).toBe('/flow');
    expect(wrapper.getComponent(Modal).props('document')).toEqual(document);
    expect(wrapper.getComponent(Modal).props('open')).toBe(true);
    expect(saveDraftMock).not.toHaveBeenCalled();
    expect(discardMock).not.toHaveBeenCalled();
  });

  it('waits until the exit-triggered save has succeeded before navigating', async () => {
    const save = deferred<{ data: typeof savedDraft }>();
    saveDraftMock.mockReturnValue(save.promise);
    confirmMock.mockResolvedValue('confirm');
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper);
    const navigation = router.push('/next');
    await finishAnimation();
    const remained = router.currentRoute.value.path;
    save.resolve({ data: savedDraft });
    await finishAnimation();
    await navigation;

    expect(remained).toBe('/flow');
    expect(router.currentRoute.value.path).toBe('/next');
    expect(saveDraftMock).toHaveBeenCalledWith({ content: document, meta: { imageIds: [], videoIds: [] }, version: 0 });
  });

  it('keeps the route and editor after saving fails', async () => {
    confirmMock.mockResolvedValue('confirm');
    saveDraftMock.mockRejectedValue(new Error('offline'));
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper);
    const navigation = router.push('/next');
    await finishAnimation();
    await navigation;

    expect(router.currentRoute.value.path).toBe('/flow');
    expect(wrapper.getComponent(Modal).props('document')).toEqual(document);
    expect(wrapper.getComponent(Modal).props('open')).toBe(true);
    expect(failMock).toHaveBeenCalledWith('offline');
  });

  it('awaits explicit discard cleanup before allowing navigation', async () => {
    confirmMock.mockRejectedValue('cancel');
    const discard = deferred<{ failedDeletes: number }>();
    discardMock.mockReturnValue(discard.promise);
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper);
    const navigation = router.push('/next');
    await finishAnimation();
    const remained = router.currentRoute.value.path;
    discard.resolve({ failedDeletes: 0 });
    await finishAnimation();
    await navigation;

    expect(remained).toBe('/flow');
    expect(router.currentRoute.value.path).toBe('/next');
    expect(discardMock).toHaveBeenCalledOnce();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('protects dirty content even when the editor is not open', async () => {
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper, false);
    const navigation = router.push('/next');
    await finishAnimation();
    await navigation;

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/flow');
    expect(wrapper.getComponent(Modal).props('document')).toEqual(document);
  });

  it('does not let another navigation bypass a pending confirmation', async () => {
    const choice = deferred<void>();
    confirmMock.mockReturnValue(choice.promise);
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper);
    const first = router.push('/next');
    await flushPromises();
    const second = router.push('/other');
    await finishAnimation();
    const remained = router.currentRoute.value.path;
    choice.reject('close');
    await finishAnimation();
    await Promise.all([first, second]);

    expect(remained).toBe('/flow');
    expect(router.currentRoute.value.path).toBe('/flow');
    expect(confirmMock).toHaveBeenCalledOnce();
    expect(wrapper.getComponent(Modal).props('document')).toEqual(document);
  });

  it('applies the same protection to browser-style history back', async () => {
    const { wrapper, router } = await mountNavigation();
    await enterContent(wrapper);
    router.back();
    await finishAnimation();

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/flow');
    expect(wrapper.getComponent(Modal).props('document')).toEqual(document);
  });

  it('blocks route changes while a publication is pending', async () => {
    const { wrapper, router } = await mountNavigation();
    wrapper.getComponent(Modal).vm.$emit('update:publishing', true);
    await nextTick();
    const navigation = router.push('/next');
    await finishAnimation();
    await navigation;

    expect(router.currentRoute.value.path).toBe('/flow');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('allows unchanged content to leave without a confirmation', async () => {
    const { router } = await mountNavigation();
    const navigation = router.push('/next');
    await finishAnimation();
    await navigation;

    expect(router.currentRoute.value.path).toBe('/next');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('restores the cord and allows editing if a later route guard aborts navigation', async () => {
    const { wrapper, router } = await mountNavigation();
    router.beforeResolve(() => false);
    const navigation = router.push('/next');
    await finishAnimation();
    await navigation;

    expect(router.currentRoute.value.path).toBe('/flow');
    expect(wrapper.get('.flow-cord-wrap').classes()).toContain('is-visible');
    await enterContent(wrapper);
    expect(wrapper.getComponent(Modal).props('open')).toBe(true);
    expect(wrapper.getComponent(Modal).props('document')).toEqual(document);
  });

  it('locks the composer after accepting a leave decision until navigation settles', async () => {
    const { wrapper, router } = await mountNavigation();
    const navigation = router.push('/next');
    await flushPromises();
    const modal = wrapper.getComponent(Modal);
    expect(modal.props('lifecycleLocked')).toBe(true);
    const baseline = modal.props('document');
    modal.vm.$emit('update:json', document);
    await nextTick();
    expect(modal.props('document')).toEqual(baseline);

    await finishAnimation();
    await navigation;
    expect(router.currentRoute.value.path).toBe('/next');
  });

  it('stays locked when an older navigation is cancelled while the latest navigation is pending', async () => {
    const { wrapper, router } = await mountNavigation();
    let resolveTarget!: (value: boolean) => void;
    router.beforeResolve((to) => to.path === '/other' ? new Promise<boolean>((resolve) => { resolveTarget = resolve; }) : true);
    const first = router.push('/next');
    await flushPromises();
    const latest = router.push('/other');
    await finishAnimation();
    await first;

    expect(router.currentRoute.value.path).toBe('/flow');
    const modal = wrapper.getComponent(Modal);
    const remainedLocked = modal.props('lifecycleLocked');
    const baseline = modal.props('document');
    modal.vm.$emit('update:json', document);
    await nextTick();
    const remainedDocument = modal.props('document');
    resolveTarget(true);
    await latest;

    expect(remainedLocked).toBe(true);
    expect(remainedDocument).toEqual(baseline);
    expect(router.currentRoute.value.path).toBe('/other');
  });

  it('protects reload only when necessary and removes protection on unmount', async () => {
    const { wrapper } = await mountNavigation();
    const emptyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(emptyEvent);
    expect(emptyEvent.defaultPrevented).toBe(false);
    await enterContent(wrapper);
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
    wrapper.unmount();
    const afterUnmount = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterUnmount);
    expect(afterUnmount.defaultPrevented).toBe(false);
  });
});
