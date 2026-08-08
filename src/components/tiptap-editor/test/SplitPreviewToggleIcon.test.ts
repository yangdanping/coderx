import { Maximize, Minimize } from '@lucide/vue';
import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SplitPreviewToggleIcon from '../SplitPreviewToggleIcon.vue';

describe('SplitPreviewToggleIcon', () => {
  it('renders Maximize when split preview is inactive', () => {
    const wrapper = shallowMount(SplitPreviewToggleIcon, {
      props: { expanded: false },
    });

    expect(wrapper.findComponent(Maximize).exists()).toBe(true);
    expect(wrapper.findComponent(Minimize).exists()).toBe(false);
  });

  it('renders Minimize when split preview is active', () => {
    const wrapper = shallowMount(SplitPreviewToggleIcon, {
      props: { expanded: true },
    });

    expect(wrapper.findComponent(Minimize).exists()).toBe(true);
    expect(wrapper.findComponent(Maximize).exists()).toBe(false);
  });
});
