import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveTagOrder, writeGuestTagOrder, isSortable } = vi.hoisted(() => ({
  saveTagOrder: vi.fn(),
  writeGuestTagOrder: vi.fn(),
  isSortable: vi.fn((source: { kind?: string } | null) => source?.kind === 'sortable'),
}));

vi.mock('@dnd-kit/vue', () => ({
  DragDropProvider: defineComponent({
    name: 'DragDropProvider',
    emits: ['dragEnd'],
    template: '<div data-test="drag-provider"><slot /></div>',
  }),
}));

vi.mock('@dnd-kit/vue/sortable', () => ({
  isSortable,
}));

vi.mock('@/service/article/article.request', () => ({
  createArticle: vi.fn(),
  getList: vi.fn(),
  getDetail: vi.fn(),
  likeArticle: vi.fn(),
  updateArticle: vi.fn(),
  removeArticle: vi.fn(),
  getTags: vi.fn(),
  getTagOrder: vi.fn(),
  saveTagOrder,
  changeTags: vi.fn(),
  getRecommend: vi.fn(),
}));

vi.mock('@/utils/tagOrderPreference', () => ({
  readGuestTagOrder: vi.fn(() => []),
  writeGuestTagOrder,
  mergeTagsByPreference: (items: typeof tags, ids: number[]) => ids.map((id) => items.find((item) => item.id === id)).filter(Boolean),
}));

import ArticleNav from '../ArticleNav.vue';

const tags = [
  { id: 1, name: '前端' },
  { id: 2, name: '后端' },
  { id: 3, name: 'JS/TS' },
];

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

const SortableTagItemStub = defineComponent({
  name: 'SortableTagItem',
  props: ['tag', 'index', 'active', 'direction', 'disabled', 'dragMode', 'entryAnimating', 'selectable'],
  emits: ['select'],
  template: '<div class="sortable-tag-stub" :data-tag-id="tag.id" :data-disabled="disabled" :data-drag-mode="dragMode" :data-entry-animating="entryAnimating">{{ tag.name }}</div>',
});

const MobileTagOrderDrawerStub = defineComponent({
  name: 'MobileTagOrderDrawer',
  props: ['modelValue'],
  emits: ['update:modelValue', 'reorder'],
  template: '<div data-test="mobile-drawer" :data-open="modelValue"></div>',
});

function mountNav(authStatus: 'authenticated' | 'guest' = 'authenticated', width = 1440) {
  return mount(ArticleNav, {
    props: { tags },
    global: {
      plugins: [
        createTestingPinia({
          stubActions: false,
          initialState: {
            root: { authStatus, windowInfo: { width, height: 900 } },
            article: { activeTagId: '综合', tags },
          },
        }),
      ],
      stubs: {
        SortableTagItem: SortableTagItemStub,
        MobileTagOrderDrawer: MobileTagOrderDrawerStub,
      },
    },
  });
}

describe('ArticleNav sortable tags', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('scrollTo', vi.fn());
    saveTagOrder.mockReset();
    writeGuestTagOrder.mockReset();
    saveTagOrder.mockResolvedValue({ code: 0, data: [tags[2], tags[0], tags[1]] });
  });

  it('keeps 综合 outside the sortable provider and passes stable tag ids', () => {
    const wrapper = mountNav();

    expect(wrapper.get('.tab-item').text()).toBe('综合');
    expect(wrapper.get('[data-test="drag-provider"]').text()).not.toContain('综合');
    expect(wrapper.findAll('.sortable-tag-stub').map((item) => item.attributes('data-tag-id'))).toEqual(['1', '2', '3']);
  });

  it('persists the optimistic order after a sortable drag ends', async () => {
    const wrapper = mountNav();
    await wrapper.get('[data-test="desktop-edit-toggle"]').trigger('click');
    const provider = wrapper.findComponent({ name: 'DragDropProvider' });

    provider.vm.$emit('dragEnd', {
      canceled: false,
      operation: { source: { kind: 'sortable', initialIndex: 2, index: 0 } },
    });
    await flushPromises();

    expect(saveTagOrder).toHaveBeenCalledWith([3, 1, 2]);
    expect(wrapper.findAll('.sortable-tag-stub').map((item) => item.attributes('data-tag-id'))).toEqual(['3', '1', '2']);
  });

  it('hides drag affordances until desktop edit mode is explicitly enabled', async () => {
    const wrapper = mountNav();

    expect(wrapper.findAll('.sortable-tag-stub').every((item) => item.attributes('data-drag-mode') === 'none')).toBe(true);

    await wrapper.get('[data-test="desktop-edit-toggle"]').trigger('click');

    expect(wrapper.findAll('.sortable-tag-stub').every((item) => item.attributes('data-drag-mode') === 'item')).toBe(true);
    expect(wrapper.findAll('.sortable-tag-stub').every((item) => item.attributes('data-entry-animating') === 'true')).toBe(true);
  });

  it('lets guests reorder locally without calling the authenticated endpoint', async () => {
    const wrapper = mountNav('guest');
    await wrapper.get('[data-test="desktop-edit-toggle"]').trigger('click');
    const provider = wrapper.findComponent({ name: 'DragDropProvider' });

    provider.vm.$emit('dragEnd', {
      canceled: false,
      operation: { source: { kind: 'sortable', initialIndex: 0, index: 2 } },
    });
    await flushPromises();

    expect(writeGuestTagOrder).toHaveBeenCalledWith([2, 3, 1]);
    expect(saveTagOrder).not.toHaveBeenCalled();
  });

  it('leaves desktop edit mode when the user points outside the tag navigation', async () => {
    const wrapper = mountNav();
    await wrapper.get('[data-test="desktop-edit-toggle"]').trigger('click');

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.sortable-tag-stub').every((item) => item.attributes('data-drag-mode') === 'none')).toBe(true);
  });
});
