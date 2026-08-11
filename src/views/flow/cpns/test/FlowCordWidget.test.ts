import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: vi.fn(),
}));

import FlowCordWidget from '../FlowCordWidget.vue';

describe('FlowCordWidget', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles the editor without changing the page scroll position', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const wrapper = mount(FlowCordWidget, {
      props: {
        modelValue: false,
      },
    });

    await wrapper.get('.flow-cord-handle').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('cannot reopen the editor while a composer reset transaction is active', async () => {
    const wrapper = mount(FlowCordWidget, {
      props: { modelValue: false, disabled: true },
    });

    const handle = wrapper.get('.flow-cord-handle');
    expect(handle.attributes('disabled')).toBeDefined();
    await handle.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
