import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlowImageAsset } from '@/service/flow/flow.types';

const { deleteFlowDraftRequestMock, getFlowDraftRequestMock, saveFlowDraftRequestMock } = vi.hoisted(() => ({
  deleteFlowDraftRequestMock: vi.fn(),
  getFlowDraftRequestMock: vi.fn(),
  saveFlowDraftRequestMock: vi.fn(),
}));

vi.mock('@/service/flow/flow-draft.request', () => ({
  deleteFlowDraftRequest: deleteFlowDraftRequestMock,
  getFlowDraftRequest: getFlowDraftRequestMock,
  saveFlowDraftRequest: saveFlowDraftRequestMock,
}));

vi.mock('@/composables/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ pullDistance: shallowRef(0), isRefreshing: shallowRef(false) }),
}));

vi.mock('@/stores/user.store', () => ({
  default: () => ({ userInfo: { id: 7 }, token: 'token' }),
}));

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn() },
}));

import Flow from '../Flow.vue';

const wrappers: VueWrapper[] = [];

const textDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '恢复失败后的输入' }] }],
};

const replacementImage: FlowImageAsset = {
  id: 99,
  url: '/image-99.webp',
  thumbnailUrl: '/image-99-thumb.webp',
  mimeType: 'image/webp',
  sizeBytes: 99,
  width: 800,
  height: 600,
};

const ModalStub = defineComponent({
  name: 'FlowEditorModal',
  props: ['open', 'content', 'document', 'restoredImages', 'editorDisabled', 'clearDisabled', 'publishDisabled'],
  emits: ['close', 'update:content', 'update:json', 'update:image-assets', 'update:media-ids'],
  setup() {
    return () => h('div');
  },
});

const CordStub = defineComponent({
  name: 'FlowCordWidget',
  props: ['disabled'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('button');
  },
});

const FeedStub = defineComponent({
  name: 'FlowFeed',
  setup(_, { expose }) {
    expose({ refetch: vi.fn() });
    return () => h('div');
  },
});

function mountFlow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
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
  wrappers.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  deleteFlowDraftRequestMock.mockReset();
  getFlowDraftRequestMock.mockReset().mockRejectedValue(new Error('draft recovery failed'));
  saveFlowDraftRequestMock.mockReset();
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

describe('Flow draft recovery failure', () => {
  it('keeps later edits in page memory without scheduling a remote save', async () => {
    const wrapper = mountFlow();
    await flushPromises();
    const modal = wrapper.getComponent(ModalStub);

    expect(modal.props('publishDisabled')).toBe(true);
    expect(modal.props('clearDisabled')).toBe(true);
    expect(modal.props('editorDisabled')).toBe(false);

    modal.vm.$emit('update:content', '恢复失败后继续编辑');
    modal.vm.$emit('update:json', textDocument);
    modal.vm.$emit('update:image-assets', [replacementImage]);
    modal.vm.$emit('update:media-ids', [99]);
    await nextTick();

    expect(modal.props('content')).toBe('恢复失败后继续编辑');
    expect(modal.props('document')).toEqual(textDocument);
    expect(modal.props('restoredImages')).toEqual([replacementImage]);

    await vi.advanceTimersByTimeAsync(1200);
    await flushPromises();

    expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('coderx_flow_draft_v1:user:7')).toBeNull();
  });
});
