import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, onMounted, shallowRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flowKeys } from '@/composables/useFlowFeed';

import type { FlowImageAsset } from '@/service/flow/flow.types';

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

const restoredImages: FlowImageAsset[] = [
  {
    id: 42,
    url: '/image-42.webp',
    thumbnailUrl: '/image-42-thumb.webp',
    mimeType: 'image/webp',
    sizeBytes: 42,
    width: 800,
    height: 600,
  },
  {
    id: 41,
    url: '/image-41.webp',
    thumbnailUrl: '/image-41-thumb.webp',
    mimeType: 'image/webp',
    sizeBytes: 41,
    width: 800,
    height: 600,
  },
];
const incompleteRestoredImages = [restoredImages[1]!];
const replacementImage: FlowImageAsset = {
  id: 99,
  url: '/image-99.webp',
  thumbnailUrl: '/image-99-thumb.webp',
  mimeType: 'image/webp',
  sizeBytes: 99,
  width: 800,
  height: 600,
};
const anotherRestoredImage: FlowImageAsset = {
  id: 40,
  url: '/image-40.webp',
  thumbnailUrl: '/image-40-thumb.webp',
  mimeType: 'image/webp',
  sizeBytes: 40,
  width: 800,
  height: 600,
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
  props: ['open', 'content', 'document', 'restoredImages', 'editorDisabled', 'clearDisabled', 'publishDisabled', 'lifecycleLocked'],
  emits: ['close', 'update:content', 'update:document', 'update:json', 'update:image-assets', 'update:media-ids', 'update:publishing', 'clear-draft', 'published', 'after-close'],
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

  it('restores image descriptors before document hydration can record a snapshot', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    const restoredDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '恢复的 Flow' }] }],
    };
    let resolveInitialize!: (value: unknown) => void;
    autosave.initialize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInitialize = resolve;
        }),
    );

    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    modal.vm.$emit('update:json', restoredDocument);
    expect(autosave.recordSnapshot).not.toHaveBeenCalledWith(
      expect.objectContaining({ meta: { imageIds: [], videoIds: [] } }),
      expect.anything(),
    );

    resolveInitialize({
      content: restoredDocument,
      meta: { imageIds: [42, 41], videoIds: [] },
      images: restoredImages,
      imagesComplete: true,
    });
    await flushPromises();

    expect(modal.props('restoredImages').map((image: FlowImageAsset) => image.id)).toEqual([42, 41]);
    modal.vm.$emit('update:json', restoredDocument);

    modal.vm.$emit('update:json', textDocument);
    await flushPromises();
    expect(autosave.recordSnapshot).toHaveBeenLastCalledWith(
      {
        content: textDocument,
        meta: { imageIds: [42, 41], videoIds: [] },
      },
      restoredImages,
    );
  });

  it('keeps the composer lifecycle locked while draft restoration is pending', async () => {
    let resolveInitialize!: (value: unknown) => void;
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.initialize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInitialize = resolve;
        }),
    );
    const { wrapper } = mountFlow();
    await flushPromises();
    const cord = wrapper.getComponent(CordStub);
    const modal = wrapper.getComponent(ModalStub);

    cord.vm.$emit('update:modelValue', true);
    await nextTick();
    modal.vm.$emit('close');
    await nextTick();

    expect(modal.props('open')).toBe(true);
    resolveInitialize(null);
    await flushPromises();
  });

  it('retains unresolved restored image ids when available attachments are deleted or reordered', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    const restoredDocument = textDocument;
    autosave.initialize.mockResolvedValue({
      content: restoredDocument,
      meta: { imageIds: [42, 41], videoIds: [] },
      images: incompleteRestoredImages,
      imagesComplete: false,
    });
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);

    modal.vm.$emit('update:image-assets', incompleteRestoredImages);
    modal.vm.$emit('update:media-ids', [41]);
    await flushPromises();

    expect(autosave.recordSnapshot).toHaveBeenLastCalledWith(
      {
        content: restoredDocument,
        meta: { imageIds: [42, 41], videoIds: [] },
      },
      incompleteRestoredImages,
    );
    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);

    modal.vm.$emit('update:image-assets', []);
    modal.vm.$emit('update:media-ids', []);
    await flushPromises();

    expect(autosave.recordSnapshot).toHaveBeenLastCalledWith(
      {
        content: restoredDocument,
        meta: { imageIds: [42], videoIds: [] },
      },
      [],
    );
    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);

    modal.vm.$emit('update:image-assets', incompleteRestoredImages);
    modal.vm.$emit('update:media-ids', [41]);
    await flushPromises();

    expect(autosave.recordSnapshot).toHaveBeenLastCalledWith(
      {
        content: restoredDocument,
        meta: { imageIds: [42, 41], videoIds: [] },
      },
      incompleteRestoredImages,
    );
    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);
  });

  it('consumes unresolved ids deterministically when a newly uploaded asset replaces one', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.initialize.mockResolvedValue({
      content: textDocument,
      meta: { imageIds: [42, 41], videoIds: [] },
      images: incompleteRestoredImages,
      imagesComplete: false,
    });
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);
    const availableImages = [...incompleteRestoredImages, replacementImage];

    modal.vm.$emit('update:image-assets', availableImages);
    modal.vm.$emit('update:media-ids', [41, 99]);
    await flushPromises();

    expect(autosave.recordSnapshot).toHaveBeenLastCalledWith(
      {
        content: textDocument,
        meta: { imageIds: [41, 99], videoIds: [] },
      },
      availableImages,
    );
    expect(modal.props('publishDisabled')).toBe(false);
    expect(modal.props('clearDisabled')).toBe(false);
  });

  it('keeps unresolved placeholders stable while reordering available attachments', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    const availableImages = [anotherRestoredImage, incompleteRestoredImages[0]!];
    autosave.initialize.mockResolvedValue({
      content: textDocument,
      meta: { imageIds: [42, 41, 40], videoIds: [] },
      images: [incompleteRestoredImages[0]!, anotherRestoredImage],
      imagesComplete: false,
    });
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    modal.vm.$emit('update:image-assets', availableImages);
    modal.vm.$emit('update:media-ids', [40, 41]);
    await flushPromises();

    expect(autosave.recordSnapshot).toHaveBeenLastCalledWith(
      {
        content: textDocument,
        meta: { imageIds: [42, 40, 41], videoIds: [] },
      },
      availableImages,
    );
    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);
  });

  it('allows editing but disables publication until slow draft initialization finishes', async () => {
    let resolveInitialize!: (value: unknown) => void;
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.isHydrating.value = true;
    autosave.initialize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInitialize = resolve;
        }),
    );
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('editorDisabled')).toBe(false);
    modal.vm.$emit('update:json', textDocument);
    await flushPromises();
    expect(autosave.recordSnapshot).not.toHaveBeenCalled();

    autosave.isHydrating.value = false;
    resolveInitialize(null);
    await flushPromises();
    expect(wrapper.getComponent(ModalStub).props('publishDisabled')).toBe(false);
  });

  it.each(['error', 'conflict'])('keeps publish and clear disabled after null recovery with %s status', async (status) => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.status.value = status;
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);

    modal.vm.$emit('clear-draft');
    await flushPromises();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('locks actions after initialize rejects without blocking editor input or close', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.initialize.mockRejectedValue(new Error('draft recovery failed'));
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);
    const cord = wrapper.getComponent(CordStub);

    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);
    expect(modal.props('editorDisabled')).toBe(false);

    modal.vm.$emit('update:json', textDocument);
    cord.vm.$emit('update:modelValue', true);
    await nextTick();
    modal.vm.$emit('close');
    await flushPromises();

    expect(autosave.recordSnapshot).not.toHaveBeenCalled();
    expect(wrapper.getComponent(ModalStub).props('open')).toBe(false);
  });

  it('unlocks publish and clear for a normal no-draft idle recovery', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.status.value = 'idle';
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(false);
    expect(modal.props('clearDisabled')).toBe(false);
  });

  it('does not lock a complete local fallback when remote recovery reports an error', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.status.value = 'error';
    autosave.initialize.mockResolvedValue({
      content: textDocument,
      meta: { imageIds: [42, 41], videoIds: [] },
      images: restoredImages,
      imagesComplete: true,
    });
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(false);
    expect(modal.props('clearDisabled')).toBe(false);
  });

  it('retains the recovery failure lock after later content and media edits', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.status.value = 'error';
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    modal.vm.$emit('update:content', '恢复失败后继续编辑');
    modal.vm.$emit('update:json', textDocument);
    modal.vm.$emit('update:image-assets', [replacementImage]);
    modal.vm.$emit('update:media-ids', [99]);
    await flushPromises();

    expect(autosave.recordSnapshot).not.toHaveBeenCalled();
    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);
  });

  it('clears the recovery failure lock when resetting the composer state', async () => {
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    autosave.status.value = 'error';
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(true);
    modal.vm.$emit('published');
    modal.vm.$emit('after-close');
    await flushPromises();

    expect(wrapper.getComponent(ModalStub).props('publishDisabled')).toBe(false);
    expect(wrapper.getComponent(ModalStub).props('clearDisabled')).toBe(false);
  });

  it('extends the publication lock across page orchestration and still completes success cleanup', async () => {
    const { wrapper } = mountFlow();
    await flushPromises();
    const autosave = autosaveHolder.current as ReturnType<typeof createAutosaveMock>;
    const modal = wrapper.getComponent(ModalStub);
    const cord = wrapper.getComponent(CordStub);

    cord.vm.$emit('update:modelValue', true);
    await nextTick();
    expect(modal.props('open')).toBe(true);

    modal.vm.$emit('update:publishing', true);
    await nextTick();
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);

    modal.vm.$emit('update:json', textDocument);
    modal.vm.$emit('update:media-ids', [99]);
    modal.vm.$emit('clear-draft');
    modal.vm.$emit('close');
    await flushPromises();
    expect(autosave.recordSnapshot).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(modal.props('open')).toBe(true);

    modal.vm.$emit('published');
    modal.vm.$emit('close');
    modal.vm.$emit('update:publishing', false);
    await nextTick();
    expect(wrapper.getComponent(ModalStub).props('open')).toBe(false);
    expect(wrapper.getComponent(ModalStub).props('lifecycleLocked')).toBe(true);
    expect(autosave.resetAfterPublication).not.toHaveBeenCalled();
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(true);

    modal.vm.$emit('after-close');
    await flushPromises();
    expect(autosave.resetAfterPublication).toHaveBeenCalledOnce();
    expect(modalMountCount.value).toBe(2);
    expect(wrapper.getComponent(ModalStub).props('lifecycleLocked')).toBe(false);
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(false);
    expect(focusHandleMock).toHaveBeenCalledOnce();
  });

  it('releases the page publication lock after a failed request', async () => {
    const { wrapper } = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    modal.vm.$emit('update:publishing', true);
    await nextTick();
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);

    modal.vm.$emit('update:publishing', false);
    await nextTick();
    expect(wrapper.getComponent(CordStub).props('disabled')).toBe(false);
    expect(modal.props('clearDisabled')).toBe(false);
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
    }, []);
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
