import { shallowMount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';

import TiptapToolbar from './TiptapToolbar.vue';

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
          onClick: attrs.onClick as (() => void) | undefined,
        },
        slots.default?.(),
      );
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
});
