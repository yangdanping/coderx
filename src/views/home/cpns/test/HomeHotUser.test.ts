import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import HomeHotUser from '../HomeHotUser.vue';

const ScrollViewStub = defineComponent({
  props: {
    data: {
      type: Array,
      default: () => [],
    },
  },
  template: '<div class="scroll-view-stub"><slot name="scrollItems" :data="data" /></div>',
});

describe('HomeHotUser', () => {
  it('gives the three featured authors distinct perspectives on CoderX', () => {
    const wrapper = mount(HomeHotUser, {
      props: {
        hotUsers: [
          { id: 1, name: 'ydp' },
          { id: 2, name: 'daniel' },
          { id: 3, name: 'neo' },
        ],
      },
      global: {
        stubs: {
          ScrollView: ScrollViewStub,
          Avatar: {
            template: '<div class="avatar-stub" />',
          },
        },
      },
    });

    expect(wrapper.findAll('.hot-user-card-item__quote').map((quote) => quote.text())).toEqual([
      '我希望这里不只是发布文章，而是让想法从草稿、讨论到沉淀都有一条清晰的路径。',
      '目录和 AI 助手让我能很快抓住重点，也愿意沿着一个好问题继续读下去。',
      '编辑器没有打断创作节奏，Markdown、智能续写和即时预览都出现在刚好的时机。',
    ]);
  });
});
