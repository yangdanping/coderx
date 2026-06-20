import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import FlowMediaGallery from '../FlowMediaGallery.vue';
import type { FlowMedia } from '@/service/flow/flow.types';

const media: FlowMedia[] = [
  {
    id: 1,
    url: '/road.jpg',
    thumbnailUrl: '/road-thumb.jpg',
    title: '红色山谷公路',
  },
  {
    id: 2,
    url: '/lake.jpg',
    thumbnailUrl: '/lake-thumb.jpg',
    title: '湖边山景',
  },
  {
    id: 3,
    url: '/forest.jpg',
    thumbnailUrl: '/forest-thumb.jpg',
    title: '森林步道',
  },
];

describe('FlowMediaGallery image preview', () => {
  it('opens a library-backed lightbox with the selected image index', async () => {
    const wrapper = mount(FlowMediaGallery, {
      attachTo: document.body,
      props: {
        media,
      },
      global: {
        stubs: {
          VueEasyLightbox: {
            name: 'VueEasyLightbox',
            props: ['visible', 'imgs', 'index'],
            emits: ['hide'],
            template: '<div data-testid="library-lightbox" :data-visible="String(visible)" :data-index="String(index)" @click="$emit(\'hide\')" />',
          },
        },
      },
    });

    await wrapper.findAll('.media-slot')[1].trigger('click');
    await nextTick();

    const lightbox = wrapper.get('[data-testid="library-lightbox"]');
    const lightboxProps = wrapper.getComponent({ name: 'VueEasyLightbox' }).props();

    expect(lightbox.attributes('data-visible')).toBe('true');
    expect(lightbox.attributes('data-index')).toBe('1');
    expect(lightboxProps.imgs).toEqual(['/road.jpg', '/lake.jpg', '/forest.jpg']);

    await lightbox.trigger('click');
    await nextTick();

    expect(wrapper.getComponent({ name: 'VueEasyLightbox' }).props('visible')).toBe(false);
  });
});
