import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import ProfileDialog from '../ProfileDialog.vue';

const elDialogStub = defineComponent({
  name: 'ElDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    width: {
      type: String,
      default: '',
    },
  },
  setup(props, { slots }) {
    return () => h('section', { 'data-test': 'profile-dialog', 'data-width': props.width }, slots.default?.());
  },
});

describe('ProfileDialog', () => {
  it('uses a compact width that matches the profile form', () => {
    const wrapper = mount(ProfileDialog, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              root: {
                showProfileDialog: true,
                profileEditForm: {},
              },
            },
          }),
        ],
        stubs: {
          ElDialog: elDialogStub,
          ProfilePanel: true,
        },
      },
    });

    expect(wrapper.get('[data-test="profile-dialog"]').attributes('data-width')).toBe('480px');
  });
});
