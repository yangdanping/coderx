import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const useSortable = vi.hoisted(() => vi.fn(() => ({ isDragging: { value: false } })));

vi.mock('@dnd-kit/vue/sortable', () => ({ useSortable }));

import SortableTagItem from '../SortableTagItem.vue';

describe('SortableTagItem', () => {
  it('emits select when the tag label is clicked outside edit drag mode', async () => {
    const wrapper = mount(SortableTagItem, {
      props: {
        tag: { id: 1, name: '前端' },
        index: 0,
        active: true,
        direction: 'vertical',
        disabled: false,
        dragMode: 'none',
        selectable: true,
      },
    });

    expect(wrapper.attributes('data-tag-id')).toBe('1');
    expect(wrapper.classes()).toContain('is-active');
    expect(wrapper.get('.tag-select').text()).toBe('前端');
    expect(wrapper.find('.drag-handle').exists()).toBe(false);

    await wrapper.get('.tag-select').trigger('click');
    expect(wrapper.emitted('select')).toEqual([[1]]);
  });

  it('does not emit select when selectable is false', async () => {
    const wrapper = mount(SortableTagItem, {
      props: {
        tag: { id: 1, name: '前端' },
        index: 0,
        active: false,
        direction: 'vertical',
        disabled: false,
        dragMode: 'none',
        selectable: false,
      },
    });

    await wrapper.get('.tag-select').trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('shows an accessible drag handle only in handle drag mode', () => {
    const wrapper = mount(SortableTagItem, {
      props: {
        tag: { id: 2, name: '后端' },
        index: 1,
        active: false,
        direction: 'horizontal',
        disabled: false,
        dragMode: 'handle',
      },
    });

    const handle = wrapper.get<HTMLButtonElement>('.drag-handle');
    expect(handle.attributes('aria-label')).toBe('调整“后端”的顺序');
    expect(handle.element.disabled).toBe(false);
  });

  it('disables the drag handle while saving', () => {
    const wrapper = mount(SortableTagItem, {
      props: {
        tag: { id: 2, name: '后端' },
        index: 1,
        active: false,
        direction: 'horizontal',
        disabled: true,
        dragMode: 'handle',
      },
    });

    expect(wrapper.get<HTMLButtonElement>('.drag-handle').element.disabled).toBe(true);
  });

  it('marks whole-row drag mode without rendering a grip handle', () => {
    const wrapper = mount(SortableTagItem, {
      props: {
        tag: { id: 3, name: 'Vue' },
        index: 2,
        active: false,
        direction: 'vertical',
        disabled: false,
        dragMode: 'item',
      },
    });

    expect(wrapper.classes()).toContain('is-whole-row-drag');
    expect(wrapper.find('.drag-handle').exists()).toBe(false);
  });
});
