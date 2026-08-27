import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FlowEditorModal from '../FlowEditorModal.vue';

import type { TiptapDocContent } from '@/service/draft/draft.types';
import type { FlowImageAsset } from '@/service/flow/flow.types';

const { createFlowMock, deletePendingFlowImageMock, uploadFlowImageMock } = vi.hoisted(() => ({
  createFlowMock: vi.fn(),
  deletePendingFlowImageMock: vi.fn(),
  uploadFlowImageMock: vi.fn(),
}));

vi.mock('@/service/flow/flow.request', () => ({
  createFlow: createFlowMock,
  deletePendingFlowImage: deletePendingFlowImageMock,
  uploadFlowImage: uploadFlowImageMock,
}));

const firstRequestId = '11111111-1111-4111-8111-111111111111';
const attachmentClientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const secondRequestId = '22222222-2222-4222-8222-222222222222';
const document: TiptapDocContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '保留的草稿' }] }],
};
const uploadedAsset: FlowImageAsset = {
  id: 42,
  url: '/original.webp',
  thumbnailUrl: '/thumbnail.webp',
  mimeType: 'image/webp',
  sizeBytes: 5,
  width: 800,
  height: 600,
};
const secondUploadedAsset: FlowImageAsset = {
  id: 41,
  url: '/second.webp',
  thumbnailUrl: '/second-thumbnail.webp',
  mimeType: 'image/webp',
  sizeBytes: 7,
  width: 640,
  height: 480,
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function mountModal(overrides: Record<string, unknown> = {}) {
  return mount(FlowEditorModal, {
    props: {
      open: true,
      content: '<p>保留的草稿</p>',
      document,
      hasDraft: true,
      ...overrides,
    },
    global: {
      stubs: {
        TiptapEditorFlow: defineComponent({
          name: 'TiptapEditorFlow',
          props: ['disabled'],
          emits: ['update:content', 'update:document', 'update:json', 'files'],
          template: '<div class="editor-stub" />',
        }),
        FlowAttachmentGrid: defineComponent({
          name: 'FlowAttachmentGrid',
          props: ['attachments'],
          emits: ['retry', 'remove', 'move'],
          template: '<div class="grid-stub" />',
        }),
        ElButton: defineComponent({
          props: { disabled: Boolean, loading: Boolean },
          emits: ['click'],
          template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        }),
        Transition: false,
      },
    },
  });
}

async function uploadOneImage(wrapper: VueWrapper) {
  wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('files', [new File(['image'], 'image.webp', { type: 'image/webp' })]);
  await vi.waitFor(() => expect(uploadFlowImageMock).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(wrapper.findComponent({ name: 'FlowAttachmentGrid' }).props('attachments')[0]?.status).toBe('uploaded'));
}

async function failFirstPublication(wrapper: VueWrapper) {
  await wrapper.get('.flow-editor-modal__publish button').trigger('click');
  await flushPromises();
  expect(createFlowMock).toHaveBeenNthCalledWith(1, {
    clientRequestId: firstRequestId,
    content: document,
    mediaIds: [42],
  });
}

beforeEach(() => {
  createFlowMock.mockReset().mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce({ id: 9 });
  deletePendingFlowImageMock.mockReset();
  uploadFlowImageMock.mockReset().mockResolvedValue(uploadedAsset);
  vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(firstRequestId).mockReturnValueOnce(attachmentClientId).mockReturnValue(secondRequestId);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FlowEditorModal real upload queue retry identity', () => {
  it('restores server assets as uploaded attachments without starting uploads', async () => {
    createFlowMock.mockReset().mockResolvedValue({ id: 9 });
    const wrapper = mountModal({ restoredImages: [uploadedAsset, secondUploadedAsset] });
    await nextTick();

    const attachments = wrapper.findComponent({ name: 'FlowAttachmentGrid' }).props('attachments');
    expect(attachments).toHaveLength(2);
    expect(attachments.map((attachment: { mediaId: number }) => attachment.mediaId)).toEqual([42, 41]);
    expect(uploadFlowImageMock).not.toHaveBeenCalled();

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();

    expect(createFlowMock).toHaveBeenCalledWith({
      clientRequestId: firstRequestId,
      content: document,
      mediaIds: [42, 41],
    });
    wrapper.unmount();
  });

  it('preserves the exact frozen retry while an uploaded-image delete is pending and after it fails', async () => {
    const deletion = deferred<void>();
    deletePendingFlowImageMock.mockReturnValue(deletion.promise);
    const wrapper = mountModal();
    await uploadOneImage(wrapper);
    await failFirstPublication(wrapper);

    wrapper.findComponent({ name: 'FlowAttachmentGrid' }).vm.$emit('remove', attachmentClientId);
    await nextTick();
    expect(deletePendingFlowImageMock).toHaveBeenCalledWith(42);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);

    deletion.reject(new Error('delete failed'));
    await flushPromises();
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();
    expect(createFlowMock).toHaveBeenNthCalledWith(2, {
      clientRequestId: firstRequestId,
      content: document,
      mediaIds: [42],
    });
    wrapper.unmount();
  });

  it('rotates only after an uploaded-image delete succeeds', async () => {
    deletePendingFlowImageMock.mockResolvedValue(undefined);
    const wrapper = mountModal();
    await uploadOneImage(wrapper);
    await failFirstPublication(wrapper);

    wrapper.findComponent({ name: 'FlowAttachmentGrid' }).vm.$emit('remove', attachmentClientId);
    await vi.waitFor(() => expect(wrapper.findComponent({ name: 'FlowAttachmentGrid' }).props('attachments')).toHaveLength(0));
    expect(crypto.randomUUID).toHaveBeenCalledTimes(3);

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();
    expect(createFlowMock).toHaveBeenNthCalledWith(2, {
      clientRequestId: secondRequestId,
      content: document,
      mediaIds: [],
    });
    wrapper.unmount();
  });
});
