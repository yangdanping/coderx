import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMock = vi.hoisted(() => ({
  registerAction: vi.fn(),
}));

vi.mock('@/stores/user.store', () => ({
  default: () => ({
    registerAction: storeMock.registerAction,
  }),
}));

import RegisterAccount from '../RegisterAccount.vue';

function createStubs() {
  const focusCalls: string[] = [];

  const ElForm = defineComponent({
    name: 'ElForm',
    props: ['model', 'rules', 'statusIcon'],
    setup(_, { attrs, slots, expose }) {
      expose({
        validate(callback: (valid: boolean) => void) {
          callback(true);
        },
      });
      return () => h('form', { ...attrs, 'data-test': 'register-form' }, slots.default?.());
    },
  });

  const ElFormItem = defineComponent({
    name: 'ElFormItem',
    props: ['prop'],
    setup(props, { slots }) {
      return () => h('label', { 'data-prop': props.prop }, slots.default?.());
    },
  });

  const ElInput = defineComponent({
    name: 'ElInput',
    inheritAttrs: false,
    props: ['modelValue', 'placeholder', 'type', 'maxlength', 'clearable', 'showPassword'],
    emits: ['update:modelValue'],
    setup(props, { attrs, emit, expose }) {
      expose({
        focus() {
          focusCalls.push(String(props.placeholder));
        },
      });

      return () =>
        h('input', {
          ...attrs,
          value: props.modelValue ?? '',
          placeholder: props.placeholder,
          type: props.type,
          maxlength: props.maxlength,
          onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
        });
    },
  });

  const ElButton = defineComponent({
    name: 'ElButton',
    setup(_, { attrs, slots }) {
      return () => h('button', attrs, slots.default?.());
    },
  });

  return {
    focusCalls,
    stubs: {
      ElForm,
      ElFormItem,
      ElInput,
      ElButton,
      User: true,
      Lock: true,
      ShieldCheck: true,
    },
  };
}

describe('RegisterAccount', () => {
  beforeEach(() => {
    storeMock.registerAction.mockReset();
  });

  it('renders optional nickname between account name and password with a 30-character limit', () => {
    const { stubs } = createStubs();
    const wrapper = mount(RegisterAccount, { global: { stubs } });

    expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['用户名', '昵称（可选）', '密码', '确认密码']);
    expect(wrapper.get('[data-test="register-nickname"]').attributes('maxlength')).toBe('30');
  });

  it('submits a trimmed optional nickname', async () => {
    const { stubs } = createStubs();
    const wrapper = mount(RegisterAccount, { global: { stubs } });

    await wrapper.get('input[placeholder="用户名"]').setValue('alice');
    await wrapper.get('[data-test="register-nickname"]').setValue('  小杨  ');
    await wrapper.get('input[placeholder="密码"]').setValue('secret');
    await wrapper.get('input[placeholder="确认密码"]').setValue('secret');
    await wrapper.get('.register-btn').trigger('click');

    expect(storeMock.registerAction).toHaveBeenCalledWith({
      name: 'alice',
      password: 'secret',
      nickname: '小杨',
    });
  });

  it('submits null when optional nickname is blank', async () => {
    const { stubs } = createStubs();
    const wrapper = mount(RegisterAccount, { global: { stubs } });

    await wrapper.get('input[placeholder="用户名"]').setValue('alice');
    await wrapper.get('[data-test="register-nickname"]').setValue('   ');
    await wrapper.get('input[placeholder="密码"]').setValue('secret');
    await wrapper.get('input[placeholder="确认密码"]').setValue('secret');
    await wrapper.get('.register-btn').trigger('click');

    expect(storeMock.registerAction).toHaveBeenCalledWith({
      name: 'alice',
      password: 'secret',
      nickname: null,
    });
  });

  it('moves Enter focus through nickname, password, and confirmation', async () => {
    const { stubs, focusCalls } = createStubs();
    const wrapper = mount(RegisterAccount, { global: { stubs } });

    await wrapper.get('input[placeholder="用户名"]').trigger('keyup.enter');
    await wrapper.get('[data-test="register-nickname"]').trigger('keyup.enter');
    await wrapper.get('input[placeholder="密码"]').trigger('keyup.enter');

    expect(focusCalls).toEqual(['昵称（可选）', '密码', '确认密码']);
  });
});
