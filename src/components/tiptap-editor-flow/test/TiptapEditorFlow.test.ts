import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { capturedOptions, editorDocument, editorHtml, setContentMock } = vi.hoisted(() => ({
  capturedOptions: { current: null as Record<string, any> | null },
  editorDocument: {
    current: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Flow JSON' }] }],
    } as Record<string, unknown>,
  },
  editorHtml: { current: '<p>Flow JSON</p>' },
  setContentMock: vi.fn(),
}));

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn((options) => {
    capturedOptions.current = options as Record<string, any>;
    return shallowRef({
      getJSON: () => editorDocument.current,
      getHTML: () => editorHtml.current,
      getAttributes: vi.fn(() => ({})),
      isActive: vi.fn(() => false),
      setEditable: vi.fn(),
      destroy: vi.fn(),
      commands: { setContent: setContentMock },
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: vi.fn() }),
          toggleItalic: () => ({ run: vi.fn() }),
          extendMarkRange: () => ({
            unsetLink: () => ({ run: vi.fn() }),
            setLink: () => ({ run: vi.fn() }),
          }),
        }),
      }),
    });
  }),
  EditorContent: defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => h('div', { ...attrs, 'data-testid': 'flow-editor-surface' });
    },
  }),
}));

vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  }),
}));

vi.mock('@/components/tiptap-editor-comment/CommentToolbar.vue', () => ({
  default: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { 'data-testid': 'toolbar' }, [slots.afterLink?.()]);
    },
  }),
}));

import TiptapEditorFlow from '../TiptapEditorFlow.vue';

const toolbarSource = readFileSync(join(process.cwd(), 'src/components/tiptap-editor-comment/CommentToolbar.vue'), 'utf8');

describe('TiptapEditorFlow structured content and image delegation', () => {
  beforeEach(() => {
    capturedOptions.current = null;
    setContentMock.mockReset();
    setContentMock.mockImplementation((content: Record<string, unknown>) => {
      editorDocument.current = content;
    });
    editorHtml.current = '<p>Flow JSON</p>';
    editorDocument.current = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Flow JSON' }] }],
    };
  });

  it('emits canonical JSON with the compatibility events on each user update', async () => {
    const wrapper = mount(TiptapEditorFlow, {
      global: { stubs: { ElButton: true } },
    });
    await flushPromises();

    capturedOptions.current?.onUpdate({ editor: wrapper.vm.getEditor() });

    expect(wrapper.emitted('update:json')?.at(-1)?.[0]).toEqual(editorDocument.current);
    expect(wrapper.emitted('update:document')?.at(-1)?.[0]).toEqual(editorDocument.current);
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toBe('<p>Flow JSON</p>');
  });

  it('emits canonical JSON after restoring a structured document without inserting media nodes', async () => {
    const restoredDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '恢复内容' }] }],
    };
    const wrapper = mount(TiptapEditorFlow, {
      props: { editDocument: restoredDocument },
      global: { stubs: { ElButton: true } },
    });
    await flushPromises();

    const extensionNames = (capturedOptions.current?.extensions ?? []).map((extension: { name?: string }) => extension.name);
    expect(extensionNames).not.toContain('image');
    expect(extensionNames).not.toContain('imageUpload');
    expect(setContentMock).toHaveBeenCalledWith(restoredDocument, { emitUpdate: false });
    expect(wrapper.emitted('update:json')?.at(-1)?.[0]).toEqual(restoredDocument);
  });

  it.each(['paste', 'drop'] as const)('delegates editor-surface image %s while leaving non-image behavior to Tiptap', async (kind) => {
    const wrapper = mount(TiptapEditorFlow, {
      global: { stubs: { ElButton: true } },
    });
    await flushPromises();

    const image = new File(['image'], 'flow.png', { type: 'image/png' });
    const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
    const preventDefault = vi.fn();
    const imageEvent = {
      preventDefault,
      ...(kind === 'paste' ? { clipboardData: { files: [image, text] } } : { dataTransfer: { files: [image, text] } }),
    } as unknown as ClipboardEvent & DragEvent;
    const handler = capturedOptions.current?.editorProps?.[kind === 'paste' ? 'handlePaste' : 'handleDrop'];

    expect(handler({}, imageEvent)).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(wrapper.emitted('files')?.at(-1)?.[0]).toEqual([image]);

    const nonImageEvent = {
      preventDefault: vi.fn(),
      ...(kind === 'paste' ? { clipboardData: { files: [text] } } : { dataTransfer: { files: [text] } }),
    } as unknown as ClipboardEvent & DragEvent;
    expect(handler({}, nonImageEvent)).toBe(false);
    expect(nonImageEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('renders the Flow-only picker in the toolbar link-adjacent slot and forwards candidates', async () => {
    const wrapper = mount(TiptapEditorFlow, {
      props: { retainedCount: 4 },
      global: { stubs: { ElButton: true } },
    });
    await flushPromises();

    const picker = wrapper.getComponent({ name: 'FlowAttachmentPicker' });
    expect(picker.props('retainedCount')).toBe(4);
    const file = new File(['image'], 'picker.webp', { type: 'image/webp' });
    picker.vm.$emit('files', [file]);
    expect(wrapper.emitted('files')).toEqual([[[file]]]);
  });

  it('declares the Flow extension slot after the real link control and before undo/redo', () => {
    const linkSection = toolbarSource.indexOf('<!-- 链接按钮 -->');
    const slot = toolbarSource.indexOf('<slot name="afterLink" />', linkSection);
    const undoSection = toolbarSource.indexOf('<!-- 撤销/重做 -->');

    expect(linkSection).toBeGreaterThanOrEqual(0);
    expect(slot).toBeGreaterThan(linkSection);
    expect(slot).toBeLessThan(undoSection);
  });
});
