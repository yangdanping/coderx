import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import FlowFeedItem from '../FlowFeedItem.vue';
import type { FlowItem } from '@/service/flow/flow.types';

const item: FlowItem = {
  id: 42,
  author: {
    id: 7,
    name: '林墨',
    username: 'linmo',
    avatarUrl: '/avatar.svg',
  },
  body: '今天换了豆子，手冲里第一次喝到很清楚的柑橘香。',
  media: [
    {
      id: 1,
      url: '/coffee.jpg',
      thumbnailUrl: '/coffee-thumb.jpg',
      title: '窗边的一杯手冲咖啡',
    },
  ],
  likes: 12,
  comments: 3,
  liked: false,
  createdAt: '2026-06-11T01:00:00.000Z',
};

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { name: 'flow-detail', path: '/flow/:flowId', component: { template: '<div />' } },
    ],
  });
}

describe('FlowFeedItem', () => {
  it('opens the flow detail when the non-interactive card area is clicked', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    const wrapper = mount(FlowFeedItem, {
      props: { item },
      global: {
        plugins: [router],
        stubs: {
          ElAvatar: true,
          FlowMediaGallery: {
            template: '<div data-testid="media-gallery" @click.stop>media</div>',
          },
        },
      },
    });

    await wrapper.get('.item-detail-link').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/flow/42');
  });

  it('does not open detail from author, media, more, like, or share controls', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    const wrapper = mount(FlowFeedItem, {
      props: { item },
      global: {
        plugins: [router],
        stubs: {
          ElAvatar: true,
          FlowMediaGallery: {
            template: '<div data-testid="media-gallery" @click.stop>media</div>',
          },
        },
      },
    });

    await wrapper.get('.author-interactive').trigger('click');
    await wrapper.get('[data-testid="media-gallery"]').trigger('click');
    await wrapper.get('.more-btn').trigger('click');
    await wrapper.get('.like-action').trigger('click');
    await wrapper.get('.share-action').trigger('click');

    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it('routes through the detail overlay when the comment area is clicked', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    const wrapper = mount(FlowFeedItem, {
      props: { item },
      global: {
        plugins: [router],
        stubs: {
          ElAvatar: true,
          FlowMediaGallery: true,
        },
      },
    });

    expect(wrapper.get('.comment-action').classes()).toContain('excluded-from-detail');
    expect(wrapper.get('.comment-action').attributes('href')).toBe('/flow/42');
    expect(wrapper.get('.item-detail-link').attributes('href')).toBe('/flow/42');
  });
});
