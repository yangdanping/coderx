import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTocScrollSpy } from '../useTocScrollSpy';

import type { DetailTocTitle } from '../types/detail-toc.type';

const titles: DetailTocTitle[] = [
  { id: 'one', title: 'One', level: 1 },
  { id: 'two', title: 'Two', level: 2 },
  { id: 'three', title: 'Three', level: 2 },
];

const positions = new Map<string, number>();
const mountedWrappers: Array<ReturnType<typeof mount>> = [];

function appendHeading(id: string, viewportTop: number, misleadingOffsetTop = 0) {
  const heading = document.createElement('h2');
  heading.id = id;
  positions.set(id, viewportTop);
  Object.defineProperty(heading, 'offsetTop', { configurable: true, value: misleadingOffsetTop });
  vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        top: positions.get(id) ?? 0,
        bottom: positions.get(id) ?? 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: positions.get(id) ?? 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
  document.body.append(heading);
}

function mountScrollSpy(customTitles: readonly DetailTocTitle[] = titles) {
  const sourceTitles = ref<readonly DetailTocTitle[]>(customTitles);
  let result: ReturnType<typeof useTocScrollSpy> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        result = useTocScrollSpy({ titles: sourceTitles });
        return () => null;
      },
    }),
    { attachTo: document.body },
  );
  mountedWrappers.push(wrapper);

  if (!result) throw new Error('Scrollspy harness did not mount');
  return { result, sourceTitles, wrapper };
}

beforeEach(() => {
  positions.clear();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 4_000 });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) wrapper.unmount();
  delete (document as { onscrollend?: unknown }).onscrollend;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useTocScrollSpy', () => {
  it('selects headings from viewport coordinates instead of offsetTop', () => {
    appendHeading('one', -40, 5_000);
    appendHeading('two', 260, 10);
    appendHeading('three', 720, 20);
    const { result } = mountScrollSpy();

    result.syncActiveFromScroll();

    expect(result.activeId.value).toBe('one');
  });

  it('keeps the clicked target active while intermediate headings pass the activation line', async () => {
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 80);
    positions.set('three', 700);
    window.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result.observedId.value).toBe('two');
    expect(result.activeId.value).toBe('three');
  });

  it('clears pending when the target reaches the navigation offset', async () => {
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('three', 100);
    window.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('three');
  });

  it('clears pending when a second scroll reaches the target before the scheduled frame runs', () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      scheduledFrame = callback;
      return 42;
    });
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    positions.set('three', 500);
    window.dispatchEvent(new Event('scroll'));
    positions.set('three', 100);
    window.dispatchEvent(new Event('scroll'));

    expect(scheduledFrame).toBeDefined();
    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('three');
  });

  it('resets the idle timer for a second scroll before the scheduled frame runs', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42);
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    positions.set('three', 500);
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(100);
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(41);

    expect(result.pendingTargetId.value).toBe('three');
  });

  it('finishes from scroll inactivity rather than a click-duration timeout', async () => {
    vi.useFakeTimers();
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    positions.set('three', 500);
    window.dispatchEvent(new Event('scroll'));
    await vi.advanceTimersByTimeAsync(141);

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('two');
  });

  it('cancels pending navigation when the user wheels', () => {
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    window.dispatchEvent(new WheelEvent('wheel'));

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('two');
  });

  it('cancels pending navigation when the user starts touching the page', () => {
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    window.dispatchEvent(new Event('touchstart'));

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('two');
  });

  it('cancels pending navigation when the user presses a navigation key', () => {
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('two');
  });

  it('uses document scrollend as an enhancement to finish pending navigation', () => {
    Object.defineProperty(document, 'onscrollend', { configurable: true, value: null });
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const { result } = mountScrollSpy();

    result.scrollToHeading('three');
    positions.set('two', 60);
    document.dispatchEvent(new Event('scrollend'));

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.activeId.value).toBe('two');
  });

  it('uses instant scrolling when reduced motion is preferred', () => {
    appendHeading('two', 260, 10);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const { result } = mountScrollSpy();

    result.scrollToHeading('two');

    expect(scrollTo).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'auto' });
  });

  it('resets observed state and clears pending when title arrays are replaced', async () => {
    const initialTitles: DetailTocTitle[] = [
      { id: 'article-header-0', title: 'Introduction', level: 1 },
      { id: 'article-header-1', title: 'Middle', level: 2 },
      { id: 'article-header-2', title: 'Conclusion', level: 2 },
    ];
    appendHeading('article-header-2', 800, 20);
    const { result, sourceTitles } = mountScrollSpy(initialTitles);

    result.scrollToHeading('article-header-2');
    sourceTitles.value = initialTitles.map((title) => ({ ...title, title: `${title.title} refreshed` }));
    await nextTick();

    expect(result.pendingTargetId.value).toBeNull();
    expect(result.observedId.value).toBe('article-header-0');
  });

  it('releases listeners, animation frames, and idle timers when unmounted', () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'onscrollend', { configurable: true, value: null });
    appendHeading('one', -80, 8_000);
    appendHeading('two', 300, 10);
    appendHeading('three', 900, 20);
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame');
    const clearTimer = vi.spyOn(globalThis, 'clearTimeout');
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 27);
    const { result, wrapper } = mountScrollSpy();

    result.scrollToHeading('three');
    window.dispatchEvent(new Event('scroll'));
    wrapper.unmount();

    expect(removeWindowListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith('scrollend', expect.any(Function));
    expect(cancelAnimationFrame).toHaveBeenCalledWith(27);
    expect(clearTimer).toHaveBeenCalled();
  });
});
