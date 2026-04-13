import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AiChatDemo from '../AiChatDemo.vue';

describe('AiChatDemo', () => {
  it('renders the assistant summary after the thinking state finishes', async () => {
    vi.useFakeTimers();

    const wrapper = mount(AiChatDemo, {
      props: {
        active: true,
      },
      global: {
        stubs: {
          ThinkingShimmer: {
            template: '<div>thinking</div>',
          },
        },
      },
    });

    await vi.advanceTimersByTimeAsync(12000);
    await flushPromises();

    expect(wrapper.text()).toContain('这篇文章先介绍 TypeScript 的定位');

    wrapper.unmount();
    vi.useRealTimers();
  });
});
