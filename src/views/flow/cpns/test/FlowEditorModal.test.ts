import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { computed, defineComponent, nextTick, onMounted, onUnmounted, shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import TiptapEditorFlow from '@/components/tiptap-editor-flow/TiptapEditorFlow.vue';
import FlowEditorModal from '../FlowEditorModal.vue';

import type { TiptapDocContent } from '@/service/draft/draft.types';
import type { FlowImageAttachment } from '@/service/flow/flow.types';

const { createFlowMock, queueHolder, useQueueMock } = vi.hoisted(() => ({
  createFlowMock: vi.fn(),
  queueHolder: { current: null as Record<string, any> | null },
  useQueueMock: vi.fn(),
}));

vi.mock('@/service/flow/flow.request', () => ({
  createFlow: createFlowMock,
}));

vi.mock('@/composables/useFlowImageUploads', () => ({
  useFlowImageUploads: useQueueMock,
}));

const modalSource = readFileSync(join(process.cwd(), 'src/views/flow/cpns/FlowEditorModal.vue'), 'utf8');
const editorSource = readFileSync(join(process.cwd(), 'src/components/tiptap-editor-flow/TiptapEditorFlow.vue'), 'utf8');

const mountedWrappers: VueWrapper[] = [];
const firstRequestId = '11111111-1111-4111-8111-111111111111';
const secondRequestId = '22222222-2222-4222-8222-222222222222';

const textDocument = (text = '保留的草稿'): TiptapDocContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

function uploadedAttachment(clientId: string, mediaId: number): FlowImageAttachment {
  return {
    clientId,
    file: new File(['image'], `${clientId}.webp`, { type: 'image/webp' }),
    previewUrl: `blob:${clientId}`,
    status: 'uploaded',
    progress: 100,
    mediaId,
    url: `/${clientId}.webp`,
    thumbnailUrl: `/${clientId}-thumb.webp`,
    mimeType: 'image/webp',
    sizeBytes: 100,
    width: 800,
    height: 600,
    error: null,
  };
}

function createQueueMock() {
  const attachments = shallowRef<readonly FlowImageAttachment[]>([]);
  const uploading = shallowRef(false);
  const failed = shallowRef(false);
  const uploadedIds = shallowRef<number[]>([]);
  return {
    attachments,
    isUploading: computed(() => uploading.value),
    hasFailed: computed(() => failed.value),
    uploadedMediaIds: computed(() => uploadedIds.value),
    uploading,
    failed,
    uploadedIds,
    addFiles: vi.fn(() => ({ accepted: [], rejected: [] })),
    retry: vi.fn(),
    remove: vi.fn().mockResolvedValue(true),
    move: vi.fn(),
    dispose: vi.fn(),
  };
}

function mountModal(open = true, overrides: Record<string, unknown> = {}) {
  const wrapper = mount(FlowEditorModal, {
    attachTo: document.body,
    props: {
      open,
      content: '<p>保留的草稿</p>',
      document: textDocument(),
      draftStatus: 'saved',
      draftStatusText: '已保存',
      draftError: '',
      hasDraft: true,
      clearDisabled: false,
      editorDisabled: false,
      publishDisabled: false,
      ...overrides,
    },
    global: {
      stubs: {
        TiptapEditorFlow: defineComponent({
          name: 'TiptapEditorFlow',
          props: {
            editContent: {
              type: String,
              default: '',
            },
            editDocument: {
              type: Object,
              default: undefined,
            },
            disabled: {
              type: Boolean,
              default: false,
            },
            retainedCount: {
              type: Number,
              default: 0,
            },
          },
          emits: ['update:content', 'update:document', 'update:json', 'files'],
          template: '<div class="editor-stub" :contenteditable="!disabled">{{ editContent }}</div>',
        }),
        FlowAttachmentGrid: defineComponent({
          name: 'FlowAttachmentGrid',
          props: ['attachments'],
          emits: ['retry', 'remove', 'move', 'preview'],
          template: '<div class="attachment-grid-stub" />',
        }),
        ElButton: defineComponent({
          props: { disabled: Boolean, loading: Boolean },
          emits: ['click'],
          template: '<button type="button" :disabled="disabled" :data-loading="String(loading)" @click="$emit(\'click\')"><slot /></button>',
        }),
        Transition: false,
      },
    },
  });

  mountedWrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

beforeEach(() => {
  queueHolder.current = createQueueMock();
  useQueueMock.mockReset().mockImplementation(() => queueHolder.current);
  createFlowMock.mockReset();
  vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(firstRequestId).mockReturnValue(secondRequestId);
});

describe('FlowEditorModal', () => {
  it('suppresses the old document update when the real Tiptap editor becomes disabled', async () => {
    const wrapper = mount(TiptapEditorFlow, {
      props: {
        editDocument: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '清空前的内容' }] }],
        },
        disabled: false,
      },
      global: {
        stubs: {
          CommentToolbar: true,
          BubbleMenu: true,
          ElButton: true,
        },
      },
    });
    mountedWrappers.push(wrapper);
    await flushPromises();

    const editor = (
      wrapper.vm as unknown as {
        getEditor: () => {
          getJSON: () => unknown;
          setEditable: (editable: boolean, emitUpdate?: boolean) => void;
        };
      }
    ).getEditor();
    editor.setEditable(false, false);
    const beforeDefaultToggle = wrapper.emitted('update:document')?.length ?? 0;

    editor.setEditable(true);
    await nextTick();
    const afterDefaultToggle = wrapper.emitted('update:document') ?? [];
    expect(afterDefaultToggle).toHaveLength(beforeDefaultToggle + 1);
    expect(afterDefaultToggle.at(-1)?.[0]).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '清空前的内容' }] }],
    });

    await wrapper.setProps({ disabled: true });
    await nextTick();
    const beforeClearUnlock = wrapper.emitted('update:document')?.length ?? 0;

    // `clearDraft()` releases isClearing before Flow.vue's await continuation applies the empty document.
    await wrapper.setProps({ disabled: false });
    await nextTick();
    expect(wrapper.emitted('update:document') ?? []).toHaveLength(beforeClearUnlock);

    const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] };
    await wrapper.setProps({ editDocument: emptyDocument });
    await nextTick();

    expect(wrapper.emitted('update:document') ?? []).toHaveLength(beforeClearUnlock);
    expect(editor.getJSON()).toEqual(emptyDocument);
  });

  it('keeps the Vue transition active for the complete cord pull duration', () => {
    expect(modalSource).toMatch(/<Transition\s+name="flow-editor-modal"\s+:duration="420"/);
  });

  it('reserves a narrow mobile foreground lane for the pulled cord', () => {
    expect(modalSource).toMatch(/@media \(max-width: 768px\)[\s\S]*\.flow-editor-modal\s*\{[\s\S]*padding-right:\s*44px/);
  });

  it('renders an accessible foreground dialog while open', async () => {
    const wrapper = mountModal();
    await flushPromises();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-label')).toBe('发布 Flow');
    expect(wrapper.get('.flow-editor-modal').isVisible()).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('requests closing from Escape even when the editor already handled the key', async () => {
    const wrapper = mountModal();
    await flushPromises();

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    escapeEvent.preventDefault();
    window.dispatchEvent(escapeEvent);
    await nextTick();

    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(wrapper.emitted('close')).toHaveLength(1);

    await wrapper.get('.flow-editor-modal__close').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('does not close when the inactive background is clicked', async () => {
    const wrapper = mountModal();

    await wrapper.get('.flow-editor-modal').trigger('click');

    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('forwards structured editor updates without treating them as a close action', async () => {
    const wrapper = mountModal();
    const document = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '结构化草稿' }] }],
    };

    wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('update:document', document);
    await nextTick();

    expect(wrapper.emitted('update:document')).toEqual([[document]]);
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('shows a polite save status and emits an explicit low-emphasis clear action', async () => {
    const wrapper = mountModal();

    const status = wrapper.get('[role="status"]');
    expect(status.attributes('aria-live')).toBe('polite');
    expect(status.text()).toContain('已保存');

    const clearButton = wrapper.get('.flow-editor-modal__clear');
    expect(clearButton.text()).toContain('清空草稿');
    await clearButton.trigger('click');
    expect(wrapper.emitted('clear-draft')).toHaveLength(1);

    await wrapper.setProps({ clearDisabled: true });
    expect(wrapper.get('.flow-editor-modal__clear').attributes('disabled')).toBeDefined();
  });

  it('makes the editor read-only while clearing is in progress', async () => {
    const wrapper = mountModal();

    await wrapper.setProps({ editorDisabled: true });

    const editor = wrapper.findComponent({ name: 'TiptapEditorFlow' });
    expect(editor.props('disabled')).toBe(true);
    expect(wrapper.get('.editor-stub').attributes('contenteditable')).toBe('false');
    expect(wrapper.get('.flow-editor-modal__attachments').attributes('inert')).toBeDefined();
    expect(wrapper.get('.flow-editor-modal__attachments').attributes('aria-disabled')).toBe('true');
    expect(editorSource).toMatch(/watch\([\s\S]*props\.disabled[\s\S]*setEditable\(!disabled, false\)/);
  });

  it('keeps the editor mounted while closing and reopening', async () => {
    let mountCount = 0;
    let unmountCount = 0;
    const StatefulEditorStub = defineComponent({
      name: 'TiptapEditorFlow',
      setup() {
        onMounted(() => mountCount++);
        onUnmounted(() => unmountCount++);
      },
      template: '<div class="editor-stub" contenteditable="true">draft</div>',
    });
    const wrapper = mount(FlowEditorModal, {
      attachTo: document.body,
      props: { open: true, content: '<p>draft</p>' },
      global: {
        stubs: {
          TiptapEditorFlow: StatefulEditorStub,
          ElButton: { template: '<button type="button" disabled><slot /></button>' },
          Transition: false,
        },
      },
    });
    mountedWrappers.push(wrapper);

    expect(mountCount).toBe(1);
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    expect(mountCount).toBe(1);
    expect(unmountCount).toBe(0);
  });

  it.each([
    ['empty document', { document: { type: 'doc', content: [{ type: 'paragraph' }] } }, false, false],
    ['uploading attachment', { document: textDocument() }, true, false],
    ['deleting attachment', { document: textDocument() }, true, false],
    ['failed attachment', { document: textDocument() }, false, true],
    ['page-level clear transaction', { document: textDocument(), editorDisabled: true }, false, false],
  ])('disables publish for %s', async (_label, props, isUploading, hasFailed) => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.uploading.value = isUploading;
    queue.failed.value = hasFailed;
    const wrapper = mountModal(true, props);
    await nextTick();

    expect(wrapper.get('.flow-editor-modal__publish button').attributes('disabled')).toBeDefined();
  });

  it('disables whitespace-only rich text but allows an uploaded-image-only Flow', async () => {
    const whitespaceDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '  \n\t  ' }] }],
    };
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    const wrapper = mountModal(true, { document: whitespaceDocument });
    await nextTick();
    expect(wrapper.get('.flow-editor-modal__publish button').attributes('disabled')).toBeDefined();

    queue.attachments.value = [uploadedAttachment('only', 42)];
    queue.uploadedIds.value = [42];
    await nextTick();
    expect(wrapper.get('.flow-editor-modal__publish button').attributes('disabled')).toBeUndefined();
  });

  it('keeps the same queue and does not dispose it across an ordinary close and reopen', async () => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    const wrapper = mountModal(true);
    expect(useQueueMock).toHaveBeenCalledOnce();

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    expect(useQueueMock).toHaveBeenCalledOnce();
    expect(queue.dispose).not.toHaveBeenCalled();
  });

  it('accepts JSON and picker candidates, forwards queue controls, and emits ordered media ids', async () => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    const wrapper = mountModal();
    await nextTick();
    expect(wrapper.emitted('update:media-ids')).toBeUndefined();

    queue.attachments.value = [uploadedAttachment('one', 42), uploadedAttachment('two', 41)];
    queue.uploadedIds.value = [42, 41];
    await nextTick();

    const editor = wrapper.findComponent({ name: 'TiptapEditorFlow' });
    const nextDocument = textDocument('结构化正文');
    editor.vm.$emit('update:json', nextDocument);
    const file = new File(['image'], 'paste.png', { type: 'image/png' });
    editor.vm.$emit('files', [file]);

    const grid = wrapper.findComponent({ name: 'FlowAttachmentGrid' });
    grid.vm.$emit('retry', 'one');
    grid.vm.$emit('remove', 'two');
    grid.vm.$emit('move', 1, 0);
    await flushPromises();

    expect(wrapper.emitted('update:json')).toEqual([[nextDocument]]);
    expect(queue.addFiles).toHaveBeenCalledWith([file]);
    expect(queue.retry).toHaveBeenCalledWith('one');
    expect(queue.remove).toHaveBeenCalledWith('two');
    expect(queue.move).toHaveBeenCalledWith(1, 0);
    expect(wrapper.emitted('update:media-ids')?.at(-1)?.[0]).toEqual([42, 41]);
  });

  it('retries the exact frozen payload and request id after failure when only no-op events and ordinary close occur', async () => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42), uploadedAttachment('two', 41)];
    queue.uploadedIds.value = [42, 41];
    createFlowMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 9 });
    const wrapper = mountModal();
    await nextTick();

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();
    expect(queue.dispose).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('发布失败，请重试');

    const editor = wrapper.findComponent({ name: 'TiptapEditorFlow' });
    editor.vm.$emit('update:content', '<p>保留的草稿</p>');
    editor.vm.$emit('update:json', textDocument());
    queue.move.mockReturnValueOnce(false);
    wrapper.findComponent({ name: 'FlowAttachmentGrid' }).vm.$emit('move', 0, 0);
    queue.uploadedIds.value = [42, 41];
    await nextTick();
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();

    const originalPayload = {
      clientRequestId: firstRequestId,
      content: textDocument(),
      mediaIds: [42, 41],
    };
    expect(createFlowMock).toHaveBeenNthCalledWith(1, originalPayload);
    expect(createFlowMock).toHaveBeenNthCalledWith(2, originalPayload);
  });

  it('allows only one POST during a double click and exposes a real busy state', async () => {
    let resolvePublish!: (value: unknown) => void;
    createFlowMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePublish = resolve;
        }),
    );
    const wrapper = mountModal();
    const button = wrapper.get('.flow-editor-modal__publish button');

    await button.trigger('click');
    await button.trigger('click');
    expect(createFlowMock).toHaveBeenCalledTimes(1);
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.attributes('data-loading')).toBe('true');

    resolvePublish({ id: 9 });
    await flushPromises();
  });

  it('locks every composer interaction around one immutable pending publication snapshot', async () => {
    let resolvePublish!: (value: unknown) => void;
    createFlowMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePublish = resolve;
        }),
    );
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42)];
    queue.uploadedIds.value = [42];
    const initialDocument = textDocument('发布快照');
    const expectedPublishedDocument = textDocument('发布快照');
    const wrapper = mountModal(true, { document: initialDocument });
    await nextTick();

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');

    expect(wrapper.emitted('update:publishing')).toEqual([[true]]);
    expect(wrapper.findComponent({ name: 'TiptapEditorFlow' }).props('disabled')).toBe(true);
    expect(wrapper.get('.flow-editor-modal__attachments').attributes('inert')).toBeDefined();
    expect(wrapper.get('.flow-editor-modal__close').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.flow-editor-modal__clear').attributes('disabled')).toBeDefined();

    const closeButton = wrapper.get('.flow-editor-modal__close');
    closeButton.element.removeAttribute('disabled');
    await closeButton.trigger('click');
    const clearButton = wrapper.get('.flow-editor-modal__clear');
    clearButton.element.removeAttribute('disabled');
    await clearButton.trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

    const editor = wrapper.findComponent({ name: 'TiptapEditorFlow' });
    const changedDocument = textDocument('不应在事务中生效');
    editor.vm.$emit('update:content', '<p>不应在事务中生效</p>');
    editor.vm.$emit('update:document', changedDocument);
    editor.vm.$emit('update:json', changedDocument);
    editor.vm.$emit('files', [new File(['late'], 'late.webp', { type: 'image/webp' })]);

    const grid = wrapper.findComponent({ name: 'FlowAttachmentGrid' });
    grid.vm.$emit('retry', 'one');
    grid.vm.$emit('remove', 'one');
    grid.vm.$emit('move', 0, 1);
    initialDocument.content![0]!.content![0]!.text = '外部突变也不能改写已发送快照';
    queue.uploadedIds.value = [99];
    await flushPromises();

    expect(wrapper.emitted('close')).toBeUndefined();
    expect(wrapper.emitted('clear-draft')).toBeUndefined();
    expect(wrapper.emitted('update:content')).toBeUndefined();
    expect(wrapper.emitted('update:document')).toBeUndefined();
    expect(wrapper.emitted('update:json')).toBeUndefined();
    expect(wrapper.emitted('update:media-ids')).toBeUndefined();
    expect(queue.addFiles).not.toHaveBeenCalled();
    expect(queue.retry).not.toHaveBeenCalled();
    expect(queue.remove).not.toHaveBeenCalled();
    expect(queue.move).not.toHaveBeenCalled();
    expect(createFlowMock).toHaveBeenCalledWith({
      clientRequestId: firstRequestId,
      content: expectedPublishedDocument,
      mediaIds: [42],
    });

    resolvePublish({ id: 9 });
    await flushPromises();

    expect(wrapper.emitted('published')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('update:publishing')).toEqual([[true], [false]]);
  });

  it('rotates the request id before retrying changed text after a publication failure', async () => {
    let rejectPublish!: (reason?: unknown) => void;
    createFlowMock
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectPublish = reject;
          }),
      )
      .mockResolvedValueOnce({ id: 9 });
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42)];
    queue.uploadedIds.value = [42];
    const wrapper = mountModal(true, { document: textDocument('第一次') });

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    rejectPublish(new Error('offline'));
    await flushPromises();

    expect(wrapper.emitted('update:publishing')).toEqual([[true], [false]]);
    expect(wrapper.findComponent({ name: 'TiptapEditorFlow' }).props('disabled')).toBe(false);
    expect(wrapper.get('.flow-editor-modal__close').attributes('disabled')).toBeUndefined();
    expect(queue.dispose).not.toHaveBeenCalled();

    const currentDocument = textDocument('失败后修改');
    wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('update:json', currentDocument);
    await wrapper.setProps({ document: currentDocument });
    await nextTick();
    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();

    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
    expect(createFlowMock).toHaveBeenNthCalledWith(2, {
      clientRequestId: secondRequestId,
      content: currentDocument,
      mediaIds: [42],
    });
  });

  it('rotates the request id before retrying a real media reorder after failure', async () => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42), uploadedAttachment('two', 41)];
    queue.uploadedIds.value = [42, 41];
    queue.move.mockReturnValueOnce(true);
    createFlowMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 9 });
    const wrapper = mountModal();

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();

    wrapper.findComponent({ name: 'FlowAttachmentGrid' }).vm.$emit('move', 1, 0);
    queue.attachments.value = [uploadedAttachment('two', 41), uploadedAttachment('one', 42)];
    queue.uploadedIds.value = [41, 42];
    await nextTick();
    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();

    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
    expect(createFlowMock).toHaveBeenNthCalledWith(2, {
      clientRequestId: secondRequestId,
      content: textDocument(),
      mediaIds: [41, 42],
    });
  });

  it('keeps the disposed queue locked throughout the parent publication leave window', async () => {
    let resolvePublish!: (value: unknown) => void;
    createFlowMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePublish = resolve;
        }),
    );
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42)];
    queue.uploadedIds.value = [42];
    const wrapper = mountModal();

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    resolvePublish({ id: 9 });
    await flushPromises();
    await wrapper.setProps({ open: false, lifecycleLocked: true });

    expect(queue.dispose).toHaveBeenCalledOnce();
    expect(wrapper.findComponent({ name: 'TiptapEditorFlow' }).props('disabled')).toBe(true);
    expect(wrapper.get('.flow-editor-modal__attachments').attributes('inert')).toBeDefined();
    expect(wrapper.get('.flow-editor-modal__close').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.flow-editor-modal__clear').attributes('disabled')).toBeDefined();

    const businessEmittedBeforeForcedEvents = Object.fromEntries(
      ['close', 'clear-draft', 'update:content', 'update:document', 'update:json', 'update:media-ids'].map((event) => [event, wrapper.emitted(event)?.length ?? 0]),
    );
    wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('update:content', '<p>late</p>');
    wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('update:document', textDocument('late'));
    wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('update:json', textDocument('late'));
    wrapper.findComponent({ name: 'TiptapEditorFlow' }).vm.$emit('files', [new File(['late'], 'late.webp', { type: 'image/webp' })]);
    const grid = wrapper.findComponent({ name: 'FlowAttachmentGrid' });
    grid.vm.$emit('retry', 'one');
    grid.vm.$emit('remove', 'one');
    grid.vm.$emit('move', 0, 1);
    const closeButton = wrapper.get('.flow-editor-modal__close');
    closeButton.element.removeAttribute('disabled');
    await closeButton.trigger('click');
    const clearButton = wrapper.get('.flow-editor-modal__clear');
    clearButton.element.removeAttribute('disabled');
    await clearButton.trigger('click');
    const publishButton = wrapper.get('.flow-editor-modal__publish button');
    publishButton.element.removeAttribute('disabled');
    await publishButton.trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    const clearResult = await (wrapper.vm as unknown as { clearAttachments: () => Promise<{ failedDeletes: number }> }).clearAttachments();
    await flushPromises();

    expect(queue.addFiles).not.toHaveBeenCalled();
    expect(queue.retry).not.toHaveBeenCalled();
    expect(queue.remove).not.toHaveBeenCalled();
    expect(queue.move).not.toHaveBeenCalled();
    expect(queue.dispose).toHaveBeenCalledOnce();
    expect(createFlowMock).toHaveBeenCalledOnce();
    expect(clearResult).toEqual({ failedDeletes: 0 });
    expect(Object.fromEntries(Object.keys(businessEmittedBeforeForcedEvents).map((event) => [event, wrapper.emitted(event)?.length ?? 0]))).toEqual(
      businessEmittedBeforeForcedEvents,
    );
  });

  it('blocks publishing during hydration preflight without locking normal editing', async () => {
    createFlowMock.mockResolvedValue({ id: 9 });
    const wrapper = mountModal(true, { publishDisabled: true });
    const editor = wrapper.findComponent({ name: 'TiptapEditorFlow' });
    expect(editor.props('disabled')).toBe(false);

    const publishButton = wrapper.get('.flow-editor-modal__publish button');
    expect(publishButton.attributes('disabled')).toBeDefined();
    publishButton.element.removeAttribute('disabled');
    await publishButton.trigger('click');
    expect(createFlowMock).not.toHaveBeenCalled();

    await wrapper.setProps({ publishDisabled: false });
    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();
    expect(createFlowMock).toHaveBeenCalledOnce();
  });

  it('disposes without deleting published media, emits published and closes only after success', async () => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42)];
    queue.uploadedIds.value = [42];
    createFlowMock.mockResolvedValue({ id: 9 });
    const wrapper = mountModal();

    await wrapper.get('.flow-editor-modal__publish button').trigger('click');
    await flushPromises();

    expect(queue.remove).not.toHaveBeenCalled();
    expect(queue.dispose).toHaveBeenCalledOnce();
    expect(wrapper.emitted('published')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('keeps deletion failures visible and clears all attachment previews after an explicit clear', async () => {
    const queue = queueHolder.current as ReturnType<typeof createQueueMock>;
    queue.attachments.value = [uploadedAttachment('one', 42), uploadedAttachment('two', 41)];
    queue.uploadedIds.value = [42, 41];
    queue.remove.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const wrapper = mountModal();

    const result = await (wrapper.vm as unknown as { clearAttachments: () => Promise<{ failedDeletes: number }> }).clearAttachments();

    expect(queue.remove.mock.calls).toEqual([['one'], ['two']]);
    expect(queue.dispose).toHaveBeenCalledOnce();
    expect(result).toEqual({ failedDeletes: 1 });
  });
});
