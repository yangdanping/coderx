import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import FlowAttachmentGrid from '../FlowAttachmentGrid.vue';

import type { FlowImageAttachment } from '@/service/flow/flow.types';

const attachments: FlowImageAttachment[] = [
  {
    clientId: 'first',
    file: new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
    previewUrl: 'blob:first',
    status: 'uploading',
    progress: 45,
    mediaId: null,
    url: null,
    thumbnailUrl: null,
    width: null,
    height: null,
    error: null,
  },
  {
    clientId: 'second',
    file: new File(['second'], 'second.png', { type: 'image/png' }),
    previewUrl: 'blob:second',
    status: 'uploading',
    progress: 80,
    mediaId: null,
    url: null,
    thumbnailUrl: null,
    width: null,
    height: null,
    error: null,
  },
  {
    clientId: 'failed',
    file: new File(['failed'], 'failed.webp', { type: 'image/webp' }),
    previewUrl: 'blob:failed',
    status: 'failed',
    progress: 0,
    mediaId: null,
    url: null,
    thumbnailUrl: null,
    width: null,
    height: null,
    error: '网络异常',
  },
  {
    clientId: 'uploaded',
    file: new File(['uploaded'], 'uploaded.webp', { type: 'image/webp' }),
    previewUrl: 'blob:uploaded',
    status: 'uploaded',
    progress: 100,
    mediaId: 88,
    url: 'https://cdn.example.com/original.webp',
    thumbnailUrl: 'https://cdn.example.com/thumb.webp',
    width: 1200,
    height: 800,
    error: null,
  },
];

function mountGrid() {
  return mount(FlowAttachmentGrid, {
    props: { attachments },
    global: {
      stubs: {
        VueEasyLightbox: {
          name: 'VueEasyLightbox',
          props: ['visible', 'imgs', 'index', 'teleport'],
          emits: ['hide'],
          template: '<div data-testid="lightbox" :data-visible="String(visible)" />',
        },
      },
    },
  });
}

describe('FlowAttachmentGrid', () => {
  it('keeps an empty live region mounted before the first upload status arrives', async () => {
    const wrapper = mount(FlowAttachmentGrid, {
      props: { attachments: [] },
      global: {
        stubs: { VueEasyLightbox: true },
      },
    });

    expect(wrapper.get('[aria-live="polite"]').text()).toBe('');

    await wrapper.setProps({ attachments: [attachments[0]!] });

    expect(wrapper.get('[aria-live="polite"]').text()).toContain('1 张图片上传中');
  });

  it('renders retained attachment state and exposes accessible recovery and ordering controls', async () => {
    const wrapper = mountGrid();

    expect(wrapper.findAll('.flow-attachment-tile')).toHaveLength(4);
    expect(wrapper.findAll('button.flow-attachment-tile__preview')).toHaveLength(4);
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('2 张图片上传中');
    expect(wrapper.text()).toContain('上传中 45%');
    expect(wrapper.text()).toContain('网络异常');

    await wrapper.get('[aria-label="将第 2 张图片前移"]').trigger('click');
    await wrapper.get('[aria-label="重试第 3 张图片"]').trigger('click');
    await wrapper.get('[aria-label="删除第 3 张图片"]').trigger('click');

    expect(wrapper.emitted('move')?.[0]).toEqual([1, 0]);
    expect(wrapper.emitted('retry')?.[0]).toEqual(['failed']);
    expect(wrapper.emitted('remove')?.[0]).toEqual(['failed']);
    expect(wrapper.get('[aria-label="将第 1 张图片前移"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[aria-label="将第 4 张图片后移"]').attributes('disabled')).toBeDefined();
  });

  it('removes unavailable previews from keyboard navigation without misleading labels', () => {
    const wrapper = mountGrid();
    const previews = wrapper.findAll('button.flow-attachment-tile__preview');

    expect(previews.slice(0, 3).every((preview) => preview.attributes('disabled') !== undefined)).toBe(true);
    expect(previews[0]!.attributes('aria-label')).toBe('第 1 张图片尚未上传，无法预览');
    expect(previews[2]!.attributes('aria-label')).toBe('第 3 张图片上传失败，无法预览');
    expect(previews[3]!.attributes('disabled')).toBeUndefined();
    expect(previews[3]!.attributes('aria-label')).toBe('预览第 4 张图片');
  });

  it('opens the lightbox only for uploaded originals and emits preview with the retained index', async () => {
    const wrapper = mountGrid();

    await wrapper.findAll('.flow-attachment-tile__preview')[0]!.trigger('click');
    expect(wrapper.get('[data-testid="lightbox"]').attributes('data-visible')).toBe('false');

    await wrapper.findAll('.flow-attachment-tile__preview')[3]!.trigger('click');

    expect(wrapper.emitted('preview')?.[0]).toEqual([3]);
    expect(wrapper.get('[data-testid="lightbox"]').attributes('data-visible')).toBe('true');
    expect(wrapper.getComponent({ name: 'VueEasyLightbox' }).props('imgs')).toEqual(['https://cdn.example.com/original.webp']);
  });
});
