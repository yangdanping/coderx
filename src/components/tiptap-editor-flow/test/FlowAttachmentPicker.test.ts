import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import FlowAttachmentPicker from '../FlowAttachmentPicker.vue';

function setInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
}

function dispatchTransferEvent(element: Element, type: 'dragover' | 'drop', files: File[] = []): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  element.dispatchEvent(event);
  return event;
}

function dispatchPasteEvent(element: Element, files: File[]): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: [{ kind: 'string', getAsFile: () => null }, ...files.map((file) => ({ kind: 'file', getAsFile: () => file }))],
    },
  });
  element.dispatchEvent(event);
  return event;
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
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    expect(wrapper.emitted('files')?.[0]).toEqual([[image]]);
    expect(inputElement.value).toBe('');
  });

  it('uses its labelled drop and paste surface without document listeners', async () => {
    const documentListener = vi.spyOn(document, 'addEventListener');
    const wrapper = mount(FlowAttachmentPicker, { props: { retainedCount: 8 } });
    const surface = wrapper.get('[aria-label="图片添加区域"]');
    const dropFile = new File(['drop'], 'drop.webp', { type: 'image/webp' });
    const pastedFile = new File(['paste'], 'paste.png', { type: 'image/png' });

    const dragOver = dispatchTransferEvent(surface.element, 'dragover');
    const drop = dispatchTransferEvent(surface.element, 'drop', [dropFile]);
    dispatchPasteEvent(surface.element, [pastedFile]);

    expect(dragOver.defaultPrevented).toBe(true);
    expect(drop.defaultPrevented).toBe(true);
    expect(documentListener).not.toHaveBeenCalled();
    expect(wrapper.emitted('files')).toEqual([[[dropFile]], [[pastedFile]]]);
    expect(wrapper.get('button[aria-label="添加图片，最多 9 张"]').attributes('disabled')).toBeUndefined();
    documentListener.mockRestore();
  });

  it('disables every candidate entry path when nine attachments are retained', () => {
    const wrapper = mount(FlowAttachmentPicker, { props: { retainedCount: 9 } });
    const surface = wrapper.get('[aria-label="图片添加区域"]');
    const image = new File(['full'], 'full.webp', { type: 'image/webp' });
    const input = wrapper.get('input[type="file"]');
    const inputElement = input.element as HTMLInputElement;
    let inputValue = 'C:\\fakepath\\full.webp';

    Object.defineProperty(inputElement, 'value', {
      configurable: true,
      get: () => inputValue,
      set: (value: string) => {
        inputValue = value;
      },
    });
    setInputFiles(inputElement, [image]);

    expect(wrapper.get('button[aria-label="添加图片，最多 9 张"]').attributes('disabled')).toBeDefined();
    expect(dispatchTransferEvent(surface.element, 'drop', [image]).defaultPrevented).toBe(true);
    dispatchPasteEvent(surface.element, [image]);
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    expect(wrapper.emitted('files')).toBeUndefined();
    expect(input.attributes('disabled')).toBeDefined();
    expect(inputValue).toBe('');
  });
});
