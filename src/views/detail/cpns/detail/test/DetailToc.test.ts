import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const mountedWrappers: Array<ReturnType<typeof mount>> = [];
const appendedHeadings: HTMLElement[] = [];
const headingViewportTops = new Map<string, number>();

function mountDetailToc(customTitles: DetailTocTitle[] = titles) {
  const wrapper = mount(DetailToc, {
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
  mountedWrappers.push(wrapper);
  return wrapper;
}

function appendHeading(id: string, viewportTop = 240, offsetTop = viewportTop) {
  const heading = document.createElement('h2');
  heading.id = id;
  headingViewportTops.set(id, viewportTop);
  Object.defineProperty(heading, 'offsetTop', {
    configurable: true,
    value: offsetTop,
  });
  vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(() => {
    const top = headingViewportTops.get(id) ?? 0;
    return {
      top,
      right: 0,
      bottom: top,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    };
  });
  document.body.append(heading);
  appendedHeadings.push(heading);
  return heading;
}

function mockRect(element: HTMLElement, rect: Pick<DOMRect, 'top' | 'bottom'>) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    top: rect.top,
    right: 0,
    bottom: rect.bottom,
    left: 0,
    width: 0,
    height: rect.bottom - rect.top,
    x: 0,
    y: rect.top,
    toJSON: () => ({}),
  });
}

async function activateLink(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.toc-rail-toggle').trigger('click');
  await nextTick();
  await nextTick();
}

beforeEach(() => {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 0,
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) wrapper.unmount();
  for (const heading of appendedHeadings.splice(0)) heading.remove();
  headingViewportTops.clear();
  vi.useRealTimers();
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

  it('keeps a pinned directory open after an outside pointer press', async () => {
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-rail-toggle').trigger('click');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();

    expect(wrapper.get('.toc-desktop').classes()).toContain('is-expanded');
    expect(wrapper.get('.toc-desktop').classes()).toContain('is-pinned');
  });

  it('unpins from the header lock control', async () => {
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-rail-toggle').trigger('click');
    await wrapper.get('.toc-panel__toggle').trigger('click');
    await nextTick();

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

  it('does not let a long-distance click settle on the following heading', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 4_000 });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    appendHeading('article-header-0', -120, -120);
    appendHeading('article-header-1', 900, 80);
    appendHeading('article-header-2', 1_200, 110);
    const wrapper = mountDetailToc();

    await wrapper.findAll('.toc-link')[1]?.trigger('click');

    headingViewportTops.set('article-header-1', 500);
    headingViewportTops.set('article-header-2', 700);
    window.dispatchEvent(new Event('scroll'));
    await nextTick();

    headingViewportTops.set('article-header-1', 100);
    headingViewportTops.set('article-header-2', 300);
    window.dispatchEvent(new Event('scroll'));
    await nextTick();
    await vi.advanceTimersByTimeAsync(901);

    expect(wrapper.find('.toc-link[aria-current="location"]').attributes('href')).toBe('#article-header-1');
  });

  it('keeps smooth scrolling with the navbar offset', async () => {
    appendHeading('article-header-1', 260);
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 300,
    });
    const scrollTo = vi.mocked(window.scrollTo);
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
    const wrapper = mountDetailToc();

    await wrapper.get('.toc-trigger').trigger('click');
    expect(wrapper.find('.drawer-stub').exists()).toBe(true);

    await wrapper.get('.toc-list-mobile .toc-item').trigger('click');
    expect(wrapper.find('.drawer-stub').exists()).toBe(false);
  });

  it('falls back to the first heading when titles replace the active heading', async () => {
    const wrapper = mountDetailToc();

    await wrapper.setProps({
      titles: [{ id: 'replacement-heading', title: 'Replacement heading', level: 1 }],
    });

    const replacementLink = wrapper.get('.toc-link');
    expect(replacementLink.attributes('href')).toBe('#replacement-heading');
    expect(replacementLink.attributes('aria-current')).toBe('location');
  });

  it('does not scroll either container when the active link is already visible', async () => {
    const wrapper = mountDetailToc();
    const shell = wrapper.get<HTMLElement>('.toc-list-shell').element;
    const activeLink = wrapper.get<HTMLElement>('.toc-link[aria-current="location"]');
    mockRect(shell, { top: 100, bottom: 500 });
    mockRect(activeLink.element, { top: 180, bottom: 220 });
    const initialWindowY = window.scrollY;
    const initialShellTop = shell.scrollTop;

    await activateLink(wrapper);

    expect(shell.scrollTop).toBe(initialShellTop);
    expect(window.scrollY).toBe(initialWindowY);
  });

  it('reveals an offscreen active link by scrolling only the toc shell', async () => {
    const wrapper = mountDetailToc();
    const shell = wrapper.get<HTMLElement>('.toc-list-shell').element;
    const activeLink = wrapper.get<HTMLElement>('.toc-link[aria-current="location"]');
    mockRect(shell, { top: 100, bottom: 500 });
    mockRect(activeLink.element, { top: 520, bottom: 570 });
    shell.scrollTop = 40;
    const initialWindowY = window.scrollY;

    await activateLink(wrapper);

    expect(shell.scrollTop).toBe(116);
    expect(window.scrollY).toBe(initialWindowY);
  });

  it('removes its global listeners on unmount', () => {
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountDetailToc();

    wrapper.unmount();

    expect(removeDocumentListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
