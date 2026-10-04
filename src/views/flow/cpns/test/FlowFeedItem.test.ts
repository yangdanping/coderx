import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import VueDOMPurifyHTML from 'vue-dompurify-html';
import { afterEach, describe, expect, it } from 'vitest';

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
  bodyHtml: '<p>今天换了豆子，手冲里第一次喝到很清楚的柑橘香。</p>',
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

const wrappers: VueWrapper[] = [];

describe('FlowFeedItem', () => {
  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  });

  it('renders rich content through the real DOMPurify directive and removes event handlers', () => {
    const router = createTestRouter();
    const wrapper = mount(FlowFeedItem, {
      props: {
        item: {
          ...item,
          bodyHtml: '<p>安全正文<img src="x" onerror="window.__flowXss = true"></p>',
        },
      },
      global: {
        plugins: [router, VueDOMPurifyHTML],
        stubs: { ElAvatar: true, FlowMediaGallery: true },
      },
    });
    wrappers.push(wrapper);

    const body = wrapper.get('.item-body');
    expect(body.text()).toContain('安全正文');
    expect(body.element.querySelector('img')?.hasAttribute('onerror')).toBe(false);
  });

  it('falls back to escaped plain text when rich HTML is empty', () => {
    const router = createTestRouter();
    const wrapper = mount(FlowFeedItem, {
      props: { item: { ...item, body: '<b>纯文本</b>', bodyHtml: '' } },
      global: { plugins: [router, VueDOMPurifyHTML], stubs: { ElAvatar: true, FlowMediaGallery: true } },
    });
    wrappers.push(wrapper);

    expect(wrapper.get('.item-body').text()).toBe('<b>纯文本</b>');
    expect(wrapper.get('.item-body').find('b').exists()).toBe(false);
  });

  it('opens the flow detail when the non-interactive card area is clicked', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    const wrapper = mount(FlowFeedItem, {
      props: { item },
      global: {
        plugins: [router, VueDOMPurifyHTML],
        stubs: {
          ElAvatar: true,
          FlowMediaGallery: {
            template: '<div data-testid="media-gallery" @click.stop>media</div>',
          },
        },
      },
    });
    wrappers.push(wrapper);

    await wrapper.get('.item-detail-link').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/flow/42');
  });

  it('opens an image preview without navigating away and retains the author information', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    const wrapper = mount(FlowFeedItem, {
      props: { item },
      global: {
        plugins: [router, VueDOMPurifyHTML],
        stubs: {
          ElAvatar: true,
          VueEasyLightbox: {
            name: 'VueEasyLightbox',
            props: ['visible', 'imgs', 'index'],
            template: '<div />',
          },
        },
      },
    });
    wrappers.push(wrapper);

    expect(wrapper.get('.author-name').text()).toBe('林墨');
    expect(wrapper.get('.post-time').attributes('datetime')).toBe(item.createdAt);
    await wrapper.get('.author-interactive').trigger('click');
    await wrapper.get('.media-slot').trigger('click');

    expect(router.currentRoute.value.fullPath).toBe('/');
    expect(wrapper.getComponent({ name: 'VueEasyLightbox' }).props('visible')).toBe(true);
    expect(wrapper.getComponent({ name: 'VueEasyLightbox' }).props('imgs')).toEqual(['/coffee.jpg']);
  });

  it('keeps the content readable in detail mode without another detail overlay', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    const wrapper = mount(FlowFeedItem, {
      props: { item, navigable: false },
      global: {
        plugins: [router, VueDOMPurifyHTML],
        stubs: {
          ElAvatar: true,
          FlowMediaGallery: true,
        },
      },
    });
    wrappers.push(wrapper);

    expect(wrapper.get('.item-body').text()).toBe(item.body);
    expect(wrapper.get('.author-name').text()).toBe(item.author.name);
    expect(wrapper.find('.item-detail-link').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('is-navigable');
  });
});
