import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick, onMounted, onUnmounted } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import FlowEditorModal from '../FlowEditorModal.vue';

const modalSource = readFileSync(join(process.cwd(), 'src/views/flow/cpns/FlowEditorModal.vue'), 'utf8');
const editorSource = readFileSync(join(process.cwd(), 'src/components/tiptap-editor-flow/TiptapEditorFlow.vue'), 'utf8');

const mountedWrappers: VueWrapper[] = [];

function mountModal(open = true) {
  const wrapper = mount(FlowEditorModal, {
    attachTo: document.body,
    props: {
      open,
      content: '<p>保留的草稿</p>',
      document: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '保留的草稿' }] }],
      },
      draftStatus: 'saved',
      draftStatusText: '已保存',
      draftError: '',
      hasDraft: true,
      clearDisabled: false,
      editorDisabled: false,
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
          },
          emits: ['update:content', 'update:document'],
          template: '<div class="editor-stub" :contenteditable="!disabled">{{ editContent }}</div>',
        }),
        ElButton: {
          template: '<button type="button" disabled><slot /></button>',
        },
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
});

describe('FlowEditorModal', () => {
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
    expect(editorSource).toMatch(/watch\([\s\S]*props\.disabled[\s\S]*setEditable\(!disabled\)/);
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
});
