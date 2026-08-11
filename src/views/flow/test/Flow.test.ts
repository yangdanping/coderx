import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, onMounted, shallowRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flowKeys } from '@/composables/useFlowFeed';

const { autosaveHolder, confirmMock, focusHandleMock, msgWarnMock, modalClearAttachmentsMock, modalMountCount } = vi.hoisted(() => ({
  autosaveHolder: { current: null as Record<string, any> | null },
  confirmMock: vi.fn(),
  focusHandleMock: vi.fn(),
  msgWarnMock: vi.fn(),
  modalClearAttachmentsMock: vi.fn(),
  modalMountCount: { value: 0 },
}));

vi.mock('@/composables/useFlowDraftAutosave', () => ({
  normalizeFlowDraftDocument: (content: unknown) => (content && typeof content === 'object' ? content : { type: 'doc', content: [{ type: 'paragraph' }] }),
  useFlowDraftAutosave: () => autosaveHolder.current,
}));

vi.mock('@/composables/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ pullDistance: shallowRef(0), isRefreshing: shallowRef(false) }),
}));

vi.mock('@/stores/user.store', () => ({
  default: () => ({ userInfo: { id: 7 }, token: 'token' }),
}));

vi.mock('@/utils', () => ({
  LocalCache: { getCache: vi.fn(() => 'token') },
  Msg: {
    showSuccess: vi.fn(),
    showFail: vi.fn(),
    showWarn: msgWarnMock,
  },
}));

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: confirmMock },
}));

import Flow from '../Flow.vue';

const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] };
const textDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '新的 Flow' }] }],
};

function createAutosaveMock() {
  return {
    status: shallowRef('saved'),
    statusText: shallowRef('已保存'),
    errorMessage: shallowRef(''),
    hasDraft: shallowRef(true),
    isSaving: shallowRef(false),
    isClearing: shallowRef(false),
    isHydrating: shallowRef(false),
    initialize: vi.fn().mockResolvedValue(null),
    recordSnapshot: vi.fn(),
    clearDraft: vi.fn().mockResolvedValue(undefined),
    resetAfterPublication: vi.fn().mockResolvedValue({ remoteCleared: true }),
  };
}

const ModalStub = defineComponent({
  name: 'FlowEditorModal',
  props: ['open', 'content', 'document', 'editorDisabled', 'clearDisabled'],
  emits: ['close', 'update:content', 'update:document', 'update:json', 'update:media-ids', 'clear-draft', 'published', 'after-close'],
  setup(_, { expose }) {
    onMounted(() => modalMountCount.value++);
    expose({ clearAttachments: modalClearAttachmentsMock });
    return () => h('div', { 'data-testid': 'modal' });
  },
});

const CordStub = defineComponent({
  name: 'FlowCordWidget',
  props: ['disabled'],
  setup(_, { expose }) {
    expose({ focusHandle: focusHandleMock });
    return () => h('button', { 'data-testid': 'cord' });
  },
});

const FeedStub = defineComponent({
  name: 'FlowFeed',
  setup(_, { expose }) {
    expose({ refetch: vi.fn() });
    return () => h('div', { 'data-testid': 'feed' });
  },
});

function mountFlow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = mount(Flow, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: {
        FlowEditorModal: ModalStub,
        FlowCordWidget: CordStub,
        FlowFeed: FeedStub,
      },
    },
  });
  return { wrapper, invalidateSpy };
}

beforeEach(() => {
  autosaveHolder.current = createAutosaveMock();
  confirmMock.mockReset().mockResolvedValue(undefined);
  focusHandleMock.mockReset();
  msgWarnMock.mockReset();
  modalClearAttachmentsMock.mockReset().mockResolvedValue({ failedDeletes: 0 });
  modalMountCount.value = 0;
});

describe('Flow composer page orchestration', () => {
  it('does not record an empty snapshot while local draft initialization is still pending', async () => {
    let resolveInitialize!: (value: unknown) => void;
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.initialize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInitialize = resolve;
        }),
    );

    mountFlow();
    await flushPromises();
    expect(autosave.recordSnapshot).not.toHaveBeenCalled();

    resolveInitialize(null);
    await flushPromises();
  });

  it('records the ordered uploaded ids with the current canonical document', async () => {
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    modal.vm.$emit('update:json', textDocument);
    modal.vm.$emit('update:media-ids', [42, 41]);
    await flushPromises();

    expect((autosaveHolder.current as ReturnType<typeof createAutosaveMock>).recordSnapshot).toHaveBeenLastCalledWith({
      content: textDocument,
      meta: { imageIds: [42, 41], videoIds: [] },
    });
  });

  it('invalidates the Flow feed immediately but creates the fresh session only after close transition', async () => {
    const { wrapper, invalidateSpy } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);
    expect(modalMountCount.value).toBe(1);

    modal.vm.$emit('published');
    await flushPromises();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: flowKeys.feed() });
    expect(modalMountCount.value).toBe(1);
    expect((autosaveHolder.current as ReturnType<typeof createAutosaveMock>).resetAfterPublication).not.toHaveBeenCalled();

    modal.vm.$emit('after-close');
    await flushPromises();

    expect((autosaveHolder.current as ReturnType<typeof createAutosaveMock>).resetAfterPublication).toHaveBeenCalledOnce();
    expect(modalMountCount.value).toBe(2);
    expect(wrapper.getComponent(ModalStub).props('document')).toEqual(emptyDocument);
    expect(focusHandleMock).toHaveBeenCalledOnce();
  });

  it('keeps the cord disabled and delays focus/new session until publication cleanup finishes', async () => {
    let resolveReset!: (value: { remoteCleared: boolean }) => void;
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.resetAfterPublication.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReset = resolve;
        }),
    );
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    modal.vm.$emit('published');
    modal.vm.$emit('update:json', textDocument);
    modal.vm.$emit('update:media-ids', []);
    modal.vm.$emit('after-close');
    await flushPromises();

    expect(autosave.recordSnapshot).not.toHaveBeenCalled();
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(true);
    expect(focusHandleMock).not.toHaveBeenCalled();
    expect(modalMountCount.value).toBe(1);

    resolveReset({ remoteCleared: true });
    await flushPromises();

    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(false);
    expect(focusHandleMock).toHaveBeenCalledOnce();
    expect(modalMountCount.value).toBe(2);
  });

  it('explicit clear removes attachment state and warns honestly when a pending media delete fails', async () => {
    let resolveAttachmentClear!: (value: { failedDeletes: number }) => void;
    modalClearAttachmentsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAttachmentClear = resolve;
        }),
    );
    const { wrapper } = mountFlow();
    await flushPromises();
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;

    wrapper.getComponent(ModalStub).vm.$emit('clear-draft');
    await flushPromises();

    expect(autosave.clearDraft).toHaveBeenCalledOnce();
    expect(modalClearAttachmentsMock).toHaveBeenCalledOnce();
    expect(wrapper.getComponent(ModalStub).props('editorDisabled')).toBe(true);
    expect(wrapper.getComponent(ModalStub).props('clearDisabled')).toBe(true);
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(true);

    wrapper.getComponent(ModalStub).vm.$emit('update:json', textDocument);
    wrapper.getComponent(ModalStub).vm.$emit('update:media-ids', [99]);
    expect(autosave.recordSnapshot).not.toHaveBeenCalled();

    resolveAttachmentClear({ failedDeletes: 1 });
    await flushPromises();

    expect(wrapper.getComponent(ModalStub).props('document')).toEqual(emptyDocument);
    expect(msgWarnMock).toHaveBeenCalledWith(expect.stringContaining('图片'));
  });
});
