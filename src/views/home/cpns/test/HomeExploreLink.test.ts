import { mount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeExploreLink from '../HomeExploreLink.vue';

type CanvasContextMock = {
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  quadraticCurveTo: ReturnType<typeof vi.fn>;
  bezierCurveTo: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  createPattern: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineJoin: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  globalAlpha: number;
  globalCompositeOperation: string;
};

const resizeObservers: MockResizeObserver[] = [];
const mutationObservers: MockMutationObserver[] = [];
const mountedWrappers: ReturnType<typeof mount>[] = [];
const animationFrames = new Map<number, FrameRequestCallback>();
const reducedMotionListeners = new Set<(event: MediaQueryListEvent) => void>();
let nextAnimationFrameId = 1;
let prefersReducedMotion = false;

class MockResizeObserver {
  private readonly callback: ResizeObserverCallback;
  private observed: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObservers.push(this);
  }

  observe = vi.fn((target: Element) => {
    this.observed.push(target);
  });

  disconnect = vi.fn(() => {
    this.observed = [];
  });

  trigger() {
    this.callback(
      this.observed.map((target) => ({ target }) as ResizeObserverEntry),
      this as unknown as ResizeObserver,
    );
  }
}

class MockMutationObserver {
  private readonly callback: MutationCallback;

  constructor(callback: MutationCallback) {
    this.callback = callback;
    mutationObservers.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();

  trigger() {
    this.callback([], this as unknown as MutationObserver);
  }
}

const RouterLinkStub = defineComponent({
  name: 'RouterLink',
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  template: '<a><slot /></a>',
});

describe('HomeExploreLink', () => {
  let context: CanvasContextMock;
  let filledColors: Array<string | CanvasGradient | CanvasPattern>;

  beforeEach(() => {
    filledColors = [];
    context = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(() => {
        filledColors.push(context.fillStyle);
      }),
      stroke: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as unknown as CanvasGradient),
      createPattern: vi.fn(() => null),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineJoin: 'miter',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
    };

    resizeObservers.length = 0;
    mutationObservers.length = 0;
    animationFrames.clear();
    reducedMotionListeners.clear();
    nextAnimationFrameId = 1;
    prefersReducedMotion = false;
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal('MutationObserver', MockMutationObserver);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = nextAnimationFrameId++;
        animationFrames.set(id, callback);
        return id;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        animationFrames.delete(id);
      }),
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' && prefersReducedMotion,
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
          reducedMotionListeners.add(listener);
        }),
        removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
          reducedMotionListeners.delete(listener);
        }),
        addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
          reducedMotionListeners.add(listener);
        }),
        removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
          reducedMotionListeners.delete(listener);
        }),
        dispatchEvent: vi.fn(),
      })),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          getPropertyValue(property: string) {
            const dark = document.documentElement.classList.contains('dark');
            const palette = dark
              ? {
                  '--note-paper': '#232838',
                  '--note-paper-crease': '#39415a',
                  '--note-paper-back': '#191d2b',
                  '--note-shadow': 'rgba(0, 0, 0, 0.55)',
                  '--note-edge': '#94b8ee',
                }
              : {
                  '--note-paper': 'rgba(255, 255, 255, 0.28)',
                  '--note-paper-crease': 'rgba(255, 255, 255, 0.78)',
                  '--note-paper-back': 'rgba(235, 240, 250, 0.36)',
                  '--note-shadow': 'rgba(15, 21, 45, 0.12)',
                  '--note-edge': 'rgba(148, 184, 238, 0.42)',
                };
            return palette[property as keyof typeof palette] ?? '';
          },
        }) as CSSStyleDeclaration,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 232,
      bottom: 64,
      width: 232,
      height: 64,
      toJSON: () => ({}),
    } as DOMRect);
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 3,
    });
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function readSource() {
    return fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/HomeExploreLink.vue'), 'utf8');
  }

  function mountLink() {
    const wrapper = mount(HomeExploreLink, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    mountedWrappers.push(wrapper);
    return wrapper;
  }

  function runAnimationFrames(limit = 80) {
    let timestamp = 0;

    for (let index = 0; index < limit && animationFrames.size > 0; index += 1) {
      const callbacks = [...animationFrames.values()];
      animationFrames.clear();
      timestamp += 16.67;
      callbacks.forEach((callback) => callback(timestamp));
    }
  }

  function lastCurlGeometry() {
    return context.quadraticCurveTo.mock.calls.slice(-7);
  }

  async function dispatchPointerMove(element: Element, init: { clientX: number; clientY: number; pointerType: string }) {
    const event = new MouseEvent('pointermove', {
      bubbles: true,
      clientX: init.clientX,
      clientY: init.clientY,
    });
    Object.defineProperty(event, 'pointerType', { value: init.pointerType });
    element.dispatchEvent(event);
    await nextTick();
  }

  it('links new visitors to the article column', () => {
    const wrapper = mountLink();
    const link = wrapper.getComponent(RouterLinkStub);

    expect(link.props('to')).toEqual({ name: 'article' });
    expect(link.text()).toContain('Go Exploring >');
  });

  it('renders one decorative canvas behind the semantic link', () => {
    const wrapper = mountLink();
    const canvas = wrapper.get('canvas.home-explore-link__canvas');
    const link = wrapper.getComponent(RouterLinkStub);

    expect(canvas.attributes('aria-hidden')).toBe('true');
    expect(link.props('to')).toEqual({ name: 'article' });
    expect(wrapper.get('.home-explore-link__label').text()).toBe('Go Exploring >');
  });

  it('removes the legacy CSS curl and ASCII shadow treatment', () => {
    const wrapper = mountLink();
    const source = readSource();

    expect(wrapper.find('.home-explore-link__ascii-shadow').exists()).toBe(false);
    expect(wrapper.find('.home-explore-link__curl').exists()).toBe(false);
    expect(wrapper.find('.home-explore-link__contact-shadow').exists()).toBe(false);
    expect(source).not.toMatch(/linear-gradient|radial-gradient|repeating-linear-gradient/);
    expect(source).not.toContain('box-shadow: inset');
    expect(source).not.toMatch(/(?:^|\n)\s*filter:/);
    expect(source).not.toContain('░');
    expect(source).not.toContain('▒');
    expect(source).not.toContain('▓');
  });

  it('defines accessible interaction, theme, and responsive fallbacks', () => {
    const source = readSource();

    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain(':where(html.dark) &');
    expect(source).toContain('min-height: 46px');
    expect(source).toContain('@media (max-width: 420px)');
  });

  it('sizes the canvas for DPR and renders a shaded paper curl', async () => {
    const wrapper = mountLink();
    await nextTick();
    const canvas = wrapper.get('canvas').element as HTMLCanvasElement;

    expect(canvas.width).toBe(464);
    expect(canvas.height).toBe(128);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    // Curl + crease are built from quadratic curves shared by face and flap.
    expect(context.quadraticCurveTo.mock.calls.length).toBeGreaterThanOrEqual(4);
    // The flap is shaded with a gradient and the note carries a stroked outline.
    expect(context.createLinearGradient).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    // Solid front face fill + gradient flap fill.
    expect(filledColors.some((color) => typeof color === 'string')).toBe(true);
    expect(filledColors.some((color) => typeof color !== 'string')).toBe(true);
  });

  it('redraws when the note is resized', async () => {
    mountLink();
    await nextTick();
    const initialDrawCount = context.clearRect.mock.calls.length;

    expect(resizeObservers).toHaveLength(1);
    resizeObservers[0]?.trigger();

    expect(context.clearRect.mock.calls.length).toBeGreaterThan(initialDrawCount);
    expect(readSource()).not.toContain('createRadialGradient');
  });

  it('expands on hover, follows the pointer, and restores on leave', async () => {
    const wrapper = mountLink();
    await nextTick();
    const link = wrapper.get('a');
    const restingGeometry = lastCurlGeometry();

    await link.trigger('pointerenter', { pointerType: 'mouse' });
    expect(requestAnimationFrame).toHaveBeenCalled();
    runAnimationFrames();
    const expandedGeometry = lastCurlGeometry();
    expect(expandedGeometry).not.toEqual(restingGeometry);

    await dispatchPointerMove(link.element, {
      pointerType: 'mouse',
      clientX: 36,
      clientY: 18,
    });
    runAnimationFrames();
    const followedGeometry = lastCurlGeometry();
    expect(followedGeometry).not.toEqual(expandedGeometry);

    await link.trigger('pointerleave', { pointerType: 'mouse' });
    runAnimationFrames();
    expect(lastCurlGeometry()).toEqual(restingGeometry);
  });

  it('uses a stable expanded fold for keyboard focus', async () => {
    const wrapper = mountLink();
    await nextTick();
    const link = wrapper.get('a');
    const restingGeometry = lastCurlGeometry();

    await link.trigger('focus');
    runAnimationFrames();
    expect(lastCurlGeometry()).not.toEqual(restingGeometry);

    await link.trigger('blur');
    runAnimationFrames();
    expect(lastCurlGeometry()).toEqual(restingGeometry);
  });

  it('uses press feedback for touch pointers', async () => {
    const wrapper = mountLink();
    await nextTick();
    const link = wrapper.get('a');
    const restingGeometry = lastCurlGeometry();

    await link.trigger('pointerdown', { pointerType: 'touch' });
    runAnimationFrames();
    expect(lastCurlGeometry()).not.toEqual(restingGeometry);

    await link.trigger('pointerup', { pointerType: 'touch' });
    runAnimationFrames();
    expect(lastCurlGeometry()).toEqual(restingGeometry);
  });

  it('applies interaction states immediately when reduced motion is preferred', async () => {
    prefersReducedMotion = true;
    const wrapper = mountLink();
    await nextTick();
    const link = wrapper.get('a');
    const restingGeometry = lastCurlGeometry();

    await link.trigger('pointerenter', { pointerType: 'mouse' });

    expect(animationFrames).toHaveLength(0);
    expect(lastCurlGeometry()).not.toEqual(restingGeometry);
  });

  it('redraws with a new palette when the root theme class changes', async () => {
    mountLink();
    await nextTick();
    const lightFront = [...filledColors].reverse().find((color) => typeof color === 'string');
    const initialDrawCount = context.clearRect.mock.calls.length;

    expect(mutationObservers).toHaveLength(1);
    document.documentElement.classList.add('dark');
    mutationObservers[0]?.trigger();

    expect(context.clearRect.mock.calls.length).toBeGreaterThan(initialDrawCount);
    const darkFront = [...filledColors].reverse().find((color) => typeof color === 'string');
    expect(darkFront).not.toEqual(lightFront);
  });

  it('responds to reduced-motion preference changes', async () => {
    mountLink();
    await nextTick();
    const initialDrawCount = context.clearRect.mock.calls.length;

    expect(reducedMotionListeners.size).toBe(1);
    prefersReducedMotion = true;
    reducedMotionListeners.forEach((listener) => {
      listener({ matches: true } as MediaQueryListEvent);
    });

    expect(context.clearRect.mock.calls.length).toBeGreaterThan(initialDrawCount);
    expect(animationFrames.size).toBe(0);
  });

  it('cleans up observers, media listeners, and animation frames on unmount', async () => {
    const wrapper = mountLink();
    await nextTick();
    await wrapper.get('a').trigger('pointerenter', { pointerType: 'mouse' });

    expect(animationFrames.size).toBeGreaterThan(0);
    wrapper.unmount();
    mountedWrappers.splice(mountedWrappers.indexOf(wrapper), 1);

    expect(resizeObservers[0]?.disconnect).toHaveBeenCalled();
    expect(mutationObservers[0]?.disconnect).toHaveBeenCalled();
    expect(reducedMotionListeners.size).toBe(0);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
