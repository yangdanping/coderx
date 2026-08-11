import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import FlowAttachmentPicker from '../FlowAttachmentPicker.vue';

function setInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
}

describe('FlowAttachmentPicker', () => {
  it('opens one image input and emits its candidate files without validation', async () => {
    const wrapper = mount(FlowAttachmentPicker, { props: { retainedCount: 0 } });
    const input = wrapper.get('input[type="file"]');
    const inputElement = input.element as HTMLInputElement;
    const click = vi.spyOn(inputElement, 'click');
    const image = new File(['image'], 'road.jpg', { type: 'image/jpeg' });

    expect(input.attributes('accept')).toBe('image/jpeg,image/png,image/webp');
    expect(input.attributes('multiple')).toBeDefined();

    await wrapper.get('button[aria-label="添加图片，最多 9 张"]').trigger('click');
    expect(click).toHaveBeenCalledOnce();

    setInputFiles(inputElement, [image]);
    await input.trigger('change');

    expect(wrapper.emitted('files')?.[0]).toEqual([[image]]);
    expect(inputElement.value).toBe('');
  });

  it('uses its labelled drop and paste surface without document listeners', async () => {
    const wrapper = mount(FlowAttachmentPicker, { props: { retainedCount: 8 } });
    const surface = wrapper.get('[aria-label="图片添加区域"]');
    const dropFile = new File(['drop'], 'drop.webp', { type: 'image/webp' });
    const pastedFile = new File(['paste'], 'paste.png', { type: 'image/png' });

    await surface.trigger('dragover');
    await surface.trigger('drop', { dataTransfer: { files: [dropFile] } });
    await surface.trigger('paste', {
      clipboardData: {
        items: [
          { kind: 'string', getAsFile: () => null },
          { kind: 'file', getAsFile: () => pastedFile },
        ],
      },
    });

    expect(wrapper.emitted('files')).toEqual([[[dropFile]], [[pastedFile]]]);
    expect(wrapper.get('button[aria-label="添加图片，最多 9 张"]').attributes('disabled')).toBeUndefined();
  });

  it('disables image selection when nine attachments are retained', () => {
    const wrapper = mount(FlowAttachmentPicker, { props: { retainedCount: 9 } });

    expect(wrapper.get('button[aria-label="添加图片，最多 9 张"]').attributes('disabled')).toBeDefined();
  });
});
