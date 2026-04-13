import { flushPromises, shallowMount } from '@vue/test-utils';
import { Comment, defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import TiptapToolbar from '../TiptapToolbar.vue';

const passthroughStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const buttonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          class: attrs.class,
          disabled: attrs.disabled,
          onMousedown: attrs.onMousedown as ((event: MouseEvent) => void) | undefined,
          onClick: attrs.onClick as (() => void) | undefined,
        },
        slots.default?.(),
      );
  },
});

const strictTooltipStub = defineComponent({
  setup(_, { slots }) {
    return () => {
      const children = slots.default?.() ?? [];
      const hasValidChild = children.some((child) => child.type !== Comment);

      if (!hasValidChild) {
        throw new Error('ElOnlyChild');
      }

      return h('div', children);
    };
  },
});

describe('TiptapToolbar', () => {
  it('emits a toggle event from the preview eye button and reflects active state', async () => {
    const wrapper = shallowMount(TiptapToolbar, {
      props: {
        editor: undefined,
        isSplitPreviewActive: true,
      },
      global: {
        stubs: {
          ElTooltip: passthroughStub,
          ElButton: buttonStub,
          ElDivider: true,
          ElDropdown: passthroughStub,
          ElDropdownMenu: passthroughStub,
          ElDropdownItem: passthroughStub,
          ElDialog: passthroughStub,
          ElForm: passthroughStub,
          ElFormItem: passthroughStub,
          ElInput: true,
          ElIcon: passthroughStub,
        },
      },
    });

    const previewToggle = wrapper.get('[data-testid="split-preview-toggle"]');

    expect(previewToggle.classes()).toContain('is-active-preview');

    await previewToggle.trigger('click');

    expect(wrapper.emitted('toggle-split-preview')).toHaveLength(1);
  });

  it('renders the autosave status text when the editor draft has been saved', () => {
    const wrapper = shallowMount(TiptapToolbar, {
      props: {
        editor: undefined,
        isSplitPreviewActive: false,
        draftStatus: 'saved',
        lastSavedAt: '2026-04-09T15:16:17.000Z',
      },
      global: {
        stubs: {
          ElTooltip: passthroughStub,
          ElButton: buttonStub,
          ElDivider: true,
          ElDropdown: passthroughStub,
          ElDropdownMenu: passthroughStub,
          ElDropdownItem: passthroughStub,
          ElDialog: passthroughStub,
          ElForm: passthroughStub,
          ElFormItem: passthroughStub,
          ElInput: true,
          ElIcon: passthroughStub,
        },
      },
    });

    const toolbar = wrapper.get('.tiptap-toolbar');

    expect(wrapper.text()).toContain('已保存');
    expect(toolbar.classes()).toContain('has-draft-status');
  });

  it('does not render an empty tooltip when draft status is hidden', () => {
    const wrapper = shallowMount(TiptapToolbar, {
      props: {
        editor: undefined,
        isSplitPreviewActive: false,
        draftStatus: 'idle',
      },
      global: {
        stubs: {
          ElTooltip: strictTooltipStub,
          ElButton: buttonStub,
          ElDivider: true,
          ElDropdown: passthroughStub,
          ElDropdownMenu: passthroughStub,
          ElDropdownItem: passthroughStub,
          ElDialog: passthroughStub,
          ElForm: passthroughStub,
          ElFormItem: passthroughStub,
          ElInput: true,
          ElIcon: passthroughStub,
        },
      },
    });

    expect(wrapper.get('.tiptap-toolbar').classes()).not.toContain('has-draft-status');
  });

  it('does not render an empty tooltip when draft status is hidden', () => {
    expect(() =>
      shallowMount(TiptapToolbar, {
        props: {
          editor: undefined,
          isSplitPreviewActive: false,
          draftStatus: 'idle',
        },
        global: {
          stubs: {
            ElTooltip: strictTooltipStub,
            ElButton: buttonStub,
            ElDivider: true,
            ElDropdown: passthroughStub,
            ElDropdownMenu: passthroughStub,
            ElDropdownItem: passthroughStub,
            ElDialog: passthroughStub,
            ElForm: passthroughStub,
            ElFormItem: passthroughStub,
            ElInput: true,
            ElIcon: passthroughStub,
          },
        },
      }),
    ).not.toThrow();
  });

  it('uploads images back at the preserved editor selection after toolbar clicks', async () => {
    const uploadImageMock = vi.fn();
    const getUploadPromiseMock = vi.fn(() => Promise.resolve());
    const wrapper = shallowMount(TiptapToolbar, {
      props: {
        editor: {
          isFocused: true,
          isActive: () => false,
          can: () => ({
            undo: () => false,
            redo: () => false,
          }),
          state: {
            selection: {
              from: 9,
              to: 9,
            },
          },
          commands: {
            uploadImage: uploadImageMock,
            uploadVideo: vi.fn(),
          },
          storage: {
            imageUpload: {
              getUploadPromise: getUploadPromiseMock,
            },
          },
        },
        isSplitPreviewActive: false,
      },
      global: {
        stubs: {
          ElTooltip: passthroughStub,
          ElButton: buttonStub,
          ElDivider: true,
          ElDropdown: passthroughStub,
          ElDropdownMenu: passthroughStub,
          ElDropdownItem: passthroughStub,
          ElDialog: passthroughStub,
          ElForm: passthroughStub,
          ElFormItem: passthroughStub,
          ElInput: true,
          ElIcon: passthroughStub,
        },
      },
    });

    await wrapper.get('[data-testid="image-upload-trigger"]').trigger('click');

    const input = wrapper.get('[data-testid="image-upload-input"]');
    const file = new File(['demo'], 'demo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    });

    await input.trigger('change');
    await flushPromises();

    expect(uploadImageMock).toHaveBeenCalledWith(file, {
      insertSelection: {
        from: 9,
        to: 9,
      },
    });
  });

  it('uses split-preview upload options when a markdown-side insertion callback is provided', async () => {
    const onUploadedMock = vi.fn();
    const resolveImageUploadOptionsMock = vi.fn(() => ({
      onUploaded: onUploadedMock,
    }));
    const uploadImageMock = vi.fn();
    const getUploadPromiseMock = vi.fn(() => Promise.resolve());

    const wrapper = shallowMount(TiptapToolbar, {
      props: {
        editor: {
          isFocused: false,
          isActive: () => false,
          can: () => ({
            undo: () => false,
            redo: () => false,
          }),
          state: {
            selection: {
              from: 1,
              to: 1,
            },
          },
          commands: {
            uploadImage: uploadImageMock,
            uploadVideo: vi.fn(),
          },
          storage: {
            imageUpload: {
              getUploadPromise: getUploadPromiseMock,
            },
          },
        },
        isSplitPreviewActive: true,
        resolveImageUploadOptions: resolveImageUploadOptionsMock,
      },
      global: {
        stubs: {
          ElTooltip: passthroughStub,
          ElButton: buttonStub,
          ElDivider: true,
          ElDropdown: passthroughStub,
          ElDropdownMenu: passthroughStub,
          ElDropdownItem: passthroughStub,
          ElDialog: passthroughStub,
          ElForm: passthroughStub,
          ElFormItem: passthroughStub,
          ElInput: true,
          ElIcon: passthroughStub,
        },
      },
    });

    await wrapper.get('[data-testid="image-upload-trigger"]').trigger('mousedown');
    await wrapper.get('[data-testid="image-upload-trigger"]').trigger('click');

    const input = wrapper.get('[data-testid="image-upload-input"]');
    const file = new File(['split'], 'split.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    });

    await input.trigger('change');
    await flushPromises();

    expect(resolveImageUploadOptionsMock).toHaveBeenCalledTimes(1);
    expect(uploadImageMock).toHaveBeenCalledWith(file, {
      onUploaded: onUploadedMock,
    });
  });
});
