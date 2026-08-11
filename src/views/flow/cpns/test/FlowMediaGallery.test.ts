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
  it('uses thumbnail URLs for keyboard-operable tiles and original URLs for the lightbox', async () => {
    const wrapper = mount(FlowMediaGallery, {
      props: { media },
      global: {
        stubs: {
          VueEasyLightbox: {
            name: 'VueEasyLightbox',
            props: ['visible', 'imgs', 'index'],
            template: '<div data-testid="library-lightbox" />',
          },
        },
      },
    });

    const firstTile = wrapper.get('.media-slot');
    expect(firstTile.element.tagName).toBe('BUTTON');
    expect(firstTile.get('img').attributes('src')).toBe('/road-thumb.jpg');
    await firstTile.trigger('click');
    await nextTick();

    expect(wrapper.getComponent({ name: 'VueEasyLightbox' }).props('imgs')).toEqual(['/road.jpg', '/lake.jpg', '/forest.jpg']);
  });

  it('falls back to the original tile URL when the thumbnail URL is empty', () => {
    const wrapper = mount(FlowMediaGallery, {
      props: { media: [{ ...media[0]!, thumbnailUrl: '' }] },
      global: { stubs: { VueEasyLightbox: true } },
    });

    expect(wrapper.get('.media-slot img').attributes('src')).toBe('/road.jpg');
  });

  it('opens a body-teleported lightbox with the selected image index', async () => {
    const wrapper = mount(FlowMediaGallery, {
      attachTo: document.body,
      props: {
        media,
      },
      global: {
        stubs: {
          VueEasyLightbox: {
            name: 'VueEasyLightbox',
            props: ['visible', 'imgs', 'index', 'teleport'],
            emits: ['hide'],
            template: '<div data-testid="library-lightbox" :data-visible="String(visible)" :data-index="String(index)" :data-teleport="teleport" @click="$emit(\'hide\')" />',
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
    expect(lightbox.attributes('data-teleport')).toBe('body');
    expect(lightboxProps.imgs).toEqual(['/road.jpg', '/lake.jpg', '/forest.jpg']);

    await lightbox.trigger('click');
    await nextTick();

    expect(wrapper.getComponent({ name: 'VueEasyLightbox' }).props('visible')).toBe(false);
  });
});
