import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@number-flow/vue', () => ({
  default: {
    name: 'NumberFlow',
    props: ['value'],
    template: '<span class="number-flow-stub">{{ value }}</span>',
  },
}));

import AnimatedNumber from '../AnimatedNumber.vue';

describe('AnimatedNumber', () => {
  it('renders NumberFlow for numeric values', () => {
    const wrapper = mount(AnimatedNumber, { props: { value: 42 } });
    expect(wrapper.find('.number-flow-stub').text()).toBe('42');
  });

  it('renders NumberFlow for numeric strings', () => {
    const wrapper = mount(AnimatedNumber, { props: { value: '7' } });
    expect(wrapper.find('.number-flow-stub').text()).toBe('7');
  });

  it('keeps non-numeric labels as plain text', () => {
    const wrapper = mount(AnimatedNumber, { props: { value: '点赞' } });
    expect(wrapper.find('.number-flow-stub').exists()).toBe(false);
    expect(wrapper.text()).toBe('点赞');
  });

  it('treats nullish values as 0 with NumberFlow', () => {
    const wrapper = mount(AnimatedNumber, { props: { value: null } });
    expect(wrapper.find('.number-flow-stub').text()).toBe('0');
  });
});
