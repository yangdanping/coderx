import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import HomeHotUserCard from '../HomeHotUserCard.vue';

describe('HomeHotUserCard', () => {
  it('renders the testimonial before a bottom-right author signature', () => {
    const wrapper = mount(HomeHotUserCard, {
      props: {
        item: {
          id: 1,
          name: 'ydp',
          avatarUrl: '/avatar.webp',
        },
        quote: '我希望这里不只是发布文章，而是让想法从草稿、讨论到沉淀都有清晰的路径。',
      },
      global: {
        stubs: {
          Avatar: {
            props: ['info', 'size'],
            template: '<div class="avatar-stub" />',
          },
        },
      },
    });

    const quote = wrapper.get('blockquote.hot-user-card-item__quote');
    const author = wrapper.get('.hot-user-card-item__author');

    expect(quote.text()).toBe('我希望这里不只是发布文章，而是让想法从草稿、讨论到沉淀都有清晰的路径。');
    expect(author.text()).toContain('ydp');
    expect(quote.element.compareDocumentPosition(author.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
