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
});
