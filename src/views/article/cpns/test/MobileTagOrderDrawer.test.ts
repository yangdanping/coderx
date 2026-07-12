import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@dnd-kit/vue', () => ({
  DragDropProvider: defineComponent({
    name: 'DragDropProvider',
    emits: ['dragEnd'],
    template: '<div data-test="mobile-drag-provider"><slot /></div>',
  }),
}));

vi.mock('@dnd-kit/vue/sortable', () => ({
  isSortable: (source: { kind?: string } | null) => source?.kind === 'sortable',
}));

import MobileTagOrderDrawer from '../MobileTagOrderDrawer.vue';

const tags = [
  { id: 1, name: '前端' },
  { id: 2, name: '后端' },
  { id: 3, name: 'JS/TS' },
];

const SortableTagItemStub = defineComponent({
  name: 'SortableTagItem',
  props: ['tag', 'dragMode', 'disabled'],
  template: '<div class="mobile-sortable-item" :data-drag-mode="dragMode" :data-disabled="disabled">{{ tag.name }}</div>',
});

const ElDrawerStub = defineComponent({
  name: 'ElDrawer',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<section class="drawer-stub"><slot /></section>',
});

const mountDrawer = () =>
  mount(MobileTagOrderDrawer, {
    props: { modelValue: true, tags, isSaving: false },
    global: {
      stubs: {
        ElDrawer: ElDrawerStub,
        SortableTagItem: SortableTagItemStub,
      },
    },
  });

describe('MobileTagOrderDrawer', () => {
  it('keeps 综合 fixed outside the sortable provider and uses explicit handles', () => {
    const wrapper = mountDrawer();

    expect(wrapper.get('[data-test="fixed-overview"]').text()).toContain('综合');
    expect(wrapper.get('[data-test="mobile-drag-provider"]').text()).not.toContain('综合');
    expect(wrapper.findAll('.mobile-sortable-item').every((item) => item.attributes('data-drag-mode') === 'handle')).toBe(true);
  });

  it('emits source and destination indices after a valid drag', async () => {
    const wrapper = mountDrawer();
    const provider = wrapper.findComponent({ name: 'DragDropProvider' });

    provider.vm.$emit('dragEnd', {
      canceled: false,
      operation: { source: { kind: 'sortable', initialIndex: 2, index: 0 } },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('reorder')).toEqual([[2, 0]]);
  });
});
