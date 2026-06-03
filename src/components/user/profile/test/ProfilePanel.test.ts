import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMock = vi.hoisted(() => ({
  updateProfileAction: vi.fn(),
}));

vi.mock('@/stores/user.store', () => ({
  default: () => ({
    updateProfileAction: storeMock.updateProfileAction,
  }),
}));

import ProfilePanel from '../ProfilePanel.vue';

function createStubs(validate = vi.fn().mockResolvedValue(true)) {
  const validateField = vi.fn().mockResolvedValue(true);

  const ElForm = defineComponent({
    name: 'ElForm',
    props: ['model', 'rules', 'labelWidth', 'labelPosition', 'statusIcon'],
    setup(_, { attrs, slots, expose }) {
      expose({ validate, validateField });

      return () => h('form', { ...attrs, 'data-test': 'profile-form' }, slots.default?.());
    },
  });

  const ElFormItem = defineComponent({
    name: 'ElFormItem',
    props: ['label', 'prop'],
    setup(props, { slots }) {
      return () => h('label', { 'data-prop': props.prop }, [h('span', props.label), slots.default?.()]);
    },
  });

  const ElInput = defineComponent({
    name: 'ElInput',
    props: ['modelValue', 'placeholder', 'clearable', 'inputmode', 'maxlength'],
    emits: ['update:modelValue'],
    setup(props, { attrs, emit }) {
      return () =>
        h('input', {
          ...attrs,
          value: props.modelValue ?? '',
          placeholder: props.placeholder,
          onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
        });
    },
  });

  const ElSelect = defineComponent({
    name: 'ElSelect',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue'],
    setup(props, { attrs, slots, emit }) {
      return () =>
        h(
          'select',
          {
            ...attrs,
            value: props.modelValue ?? '',
            onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value),
          },
          slots.default?.(),
        );
    },
  });

  const ElOption = defineComponent({
    name: 'ElOption',
    props: ['label', 'value'],
    setup(props) {
      return () => h('option', { value: props.value }, props.label);
    },
  });

  const ElCascader = defineComponent({
    name: 'ElCascader',
    props: ['modelValue', 'options', 'placeholder', 'clearable', 'filterable'],
    emits: ['update:modelValue', 'change'],
    setup(props, { attrs, emit }) {
      return () =>
        h('input', {
          ...attrs,
          value: Array.isArray(props.modelValue) ? props.modelValue.join('/') : '',
          placeholder: props.placeholder,
          onInput: (event: Event) => {
            const value = (event.target as HTMLInputElement).value.split('/').filter(Boolean);
            emit('update:modelValue', value);
            emit('change', value);
          },
        });
    },
  });

  const ElButton = defineComponent({
    name: 'ElButton',
    props: ['type', 'plain'],
    setup(_, { attrs, slots }) {
      return () => h('button', attrs, slots.default?.());
    },
  });

  const ElSteps = defineComponent({
    name: 'ElSteps',
    setup(_, { slots }) {
      return () => h('div', { 'data-test': 'profile-steps' }, slots.default?.());
    },
  });

  const ElStep = defineComponent({
    name: 'ElStep',
    props: ['title'],
    setup(props) {
      return () => h('span', props.title);
    },
  });

  return {
    validate,
    validateField,
    stubs: {
      ElForm,
      ElFormItem,
      ElInput,
      ElSelect,
      ElOption,
      ElCascader,
      ElButton,
      ElSteps,
      ElStep,
    },
  };
}

describe('ProfilePanel', () => {
  beforeEach(() => {
    storeMock.updateProfileAction.mockReset();
  });

  it('renders all profile fields in a single form without the old stepper', () => {
    const { stubs } = createStubs();

    const wrapper = mount(ProfilePanel, {
      props: {
        editForm: {
          sex: '男',
          age: 23,
          email: 'coderx@example.com',
          career: '前端',
          address: '广东省 深圳市',
        },
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('编辑资料');
    expect(wrapper.find('[data-test="profile-form"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="profile-form"]').classes()).toContain('profile-form--compact');
    expect(wrapper.find('[data-test="profile-steps"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="profile-gender-male"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="profile-gender-female"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="profile-gender-male"] img').exists()).toBe(false);
    expect(wrapper.find('[data-test="profile-gender-female"] img').exists()).toBe(false);
    expect(wrapper.findAll('.gender-option__icon')).toHaveLength(2);
    expect(wrapper.find('[data-test="profile-gender-male"]').classes()).toContain('gender-option--male');
    expect(wrapper.find('[data-test="profile-gender-female"]').classes()).toContain('gender-option--female');
    expect(wrapper.find('.form-stack').exists()).toBe(true);
    expect(wrapper.findAll('.form-stack [data-prop]').map((item) => item.attributes('data-prop'))).toEqual(['age', 'career', 'email', 'address']);
    expect(wrapper.find('[data-test="profile-career"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="profile-age"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="profile-email"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="profile-address"]').exists()).toBe(true);
  });

  it('validates before submitting and skips profile update when validation fails', async () => {
    const validate = vi.fn().mockResolvedValue(false);
    const { stubs } = createStubs(validate);

    const wrapper = mount(ProfilePanel, {
      props: {
        editForm: {
          sex: '男',
          age: 23,
          email: 'coderx@example.com',
          career: '前端',
          address: '广东省 深圳市',
        },
      },
      global: { stubs },
    });

    await wrapper.get('[data-test="profile-submit"]').trigger('click');

    expect(validate).toHaveBeenCalledTimes(1);
    expect(storeMock.updateProfileAction).not.toHaveBeenCalled();
  });
});
