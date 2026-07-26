import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DetailToc from '../DetailToc.vue';

import type { DetailTocTitle } from '../types/detail-toc.type';

const titles: DetailTocTitle[] = [
  { id: 'article-header-0', title: 'Introduction', level: 1 },
  {
    id: 'article-header-1',
    title: 'A deliberately long section heading that should stay compact',
    level: 2,
  },
  { id: 'article-header-2', title: 'Conclusion', level: 2 },
];

function mountDetailToc(customTitles: DetailTocTitle[] = titles) {
  return mount(DetailToc, {
    props: {
      titles: customTitles,
    },
    attachTo: document.body,
    global: {
      stubs: {
        ListTree: true,
        ElDrawer: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div v-if="modelValue" class="drawer-stub"><slot /></div>',
        },
      },
    },
  });
}

function appendHeading(id: string, top = 240) {
  const heading = document.createElement('h2');
  heading.id = id;
  vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({
    top,
    right: 0,
    bottom: top,
    left: 0,
    width: 0,
    height: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
  document.body.append(heading);
  return heading;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DetailToc desktop disclosure', () => {
  it('temporarily expands on hover and collapses on leave', async () => {
    const wrapper = mountDetailToc();
    const desktop = wrapper.get('.toc-desktop');

    expect(desktop.classes()).not.toContain('is-expanded');

    await desktop.trigger('mouseenter');
    expect(desktop.classes()).toContain('is-expanded');
    expect(wrapper.get('.toc-rail-toggle').attributes('aria-expanded')).toBe('true');

    await desktop.trigger('mouseleave');
    expect(desktop.classes()).not.toContain('is-expanded');
    expect(wrapper.get('.toc-rail-toggle').attributes('aria-expanded')).toBe('false');
  });

  it('temporarily expands while keyboard focus is inside', async () => {
    const wrapper = mountDetailToc();
    const toggle = wrapper.get<HTMLButtonElement>('.toc-rail-toggle');

    toggle.element.focus();
    await nextTick();
    expect(wrapper.get('.toc-desktop').classes()).toContain('is-expanded');

    toggle.element.blur();
    await nextTick();
    expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-expanded');
  });

  it('pins by click and stays expanded after the pointer leaves', async () => {
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-rail-toggle').trigger('click');
    await wrapper.get('.toc-desktop').trigger('mouseleave');

    expect(wrapper.get('.toc-desktop').classes()).toContain('is-expanded');
    expect(wrapper.get('.toc-desktop').classes()).toContain('is-pinned');
  });

  it('dismisses a pinned directory with Escape', async () => {
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-rail-toggle').trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-expanded');
    expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-pinned');
    expect(wrapper.get('.toc-rail-toggle').attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(wrapper.get('.toc-rail-toggle').element);
  });

  it('dismisses a pinned directory after an outside pointer press', async () => {
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-rail-toggle').trigger('click');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();

    expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-expanded');
    expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-pinned');
  });

  it('uses real anchors and marks the current location', () => {
    const wrapper = mountDetailToc();
    const links = wrapper.findAll<HTMLAnchorElement>('.toc-link');

    expect(links).toHaveLength(titles.length);
    expect(links[0]?.attributes('href')).toBe('#article-header-0');
    expect(links[0]?.attributes('aria-current')).toBe('location');
    expect(links[1]?.attributes('aria-current')).toBeUndefined();
    expect(links[0]?.attributes('tabindex')).toBe('-1');
  });

  it('keeps smooth scrolling with the navbar offset', async () => {
    appendHeading('article-header-1', 260);
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 300,
    });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-rail-toggle').trigger('click');
    await wrapper.findAll('.toc-link')[1]?.trigger('click');

    expect(scrollTo).toHaveBeenCalledWith({
      top: 460,
      behavior: 'smooth',
    });
  });

  it('keeps the mobile drawer close-after-selection behavior', async () => {
    appendHeading('article-header-0');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-trigger').trigger('click');
    expect(wrapper.find('.drawer-stub').exists()).toBe(true);

    await wrapper.get('.toc-list-mobile .toc-item').trigger('click');
    expect(wrapper.find('.drawer-stub').exists()).toBe(false);
  });
});
