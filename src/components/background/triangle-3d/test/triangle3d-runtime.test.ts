import type { Scene } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTriangle3DRuntime } from '../triangle3d-runtime';

type AnimationLoop = ((time: number) => void) | null;

function createMatchMedia(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    setMatches(value: boolean) {
      matches = value;
      const event = { matches: value, media: this.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  } as unknown as MediaQueryList & { setMatches(value: boolean): void };
}

function createRenderer() {
  let loop: AnimationLoop = null;

  return {
    dispose: vi.fn(),
    render: vi.fn((_scene?: Scene) => undefined),
    setAnimationLoop: vi.fn((callback: AnimationLoop) => {
      loop = callback;
    }),
    setClearColor: vi.fn(),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    outputColorSpace: '',
    get loop() {
      return loop;
    },
  };
}

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.restoreAllMocks();
});

describe('triangle 3d runtime', () => {
  it('renders the first frame and starts the slow animation loop', () => {
    const renderer = createRenderer();
    const onReady = vi.fn();
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => 1_000,
      onReady,
      random: () => 0.5,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.loop).toEqual(expect.any(Function));
    expect(onReady).toHaveBeenCalledOnce();

    runtime.dispose();
  });

  it('caps DPR, follows viewport resize, and throttles drawing to 30 FPS', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
      random: () => 0.5,
    });

    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(renderer.setSize).toHaveBeenLastCalledWith(1440, 900, false);

    currentTime = 1_010;
    renderer.loop?.(99_010);
    currentTime = 1_020;
    renderer.loop?.(99_020);
    currentTime = 1_045;
    renderer.loop?.(99_045);
    expect(renderer.render).toHaveBeenCalledTimes(3);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    window.dispatchEvent(new Event('resize'));
    expect(renderer.setSize).toHaveBeenLastCalledWith(390, 844, false);

    runtime.dispose();
  });

  it('keeps rotating while following the large orbit beyond the old easing boundary', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
      random: () => 0.5,
    });
    const scene = renderer.render.mock.calls[0]?.[0];
    const triangle = scene?.children.find((child) => child.type === 'Group');

    currentTime = 26_000;
    renderer.loop?.(260_000);
    const orbitPosition = triangle?.position.clone();
    const before = triangle?.quaternion.clone();
    currentTime = 26_050;
    renderer.loop?.(260_050);

    expect(orbitPosition?.x).toBeLessThan(-750);
    expect(orbitPosition?.y).toBeGreaterThan(110);
    expect(triangle?.quaternion.angleTo(before!)).toBeGreaterThan(0);
    runtime.dispose();
  });

  it('uses the runtime clock when animation callbacks have a different time origin', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
      random: () => 0.5,
    });
    const scene = renderer.render.mock.calls[0]?.[0];
    const triangle = scene?.children.find((child) => child.type === 'Group');
    const initialPosition = triangle?.position.clone();

    currentTime = 1_010;
    renderer.loop?.(1_000_000_000);

    expect(triangle?.position.distanceTo(initialPosition!)).toBeLessThan(1);
    runtime.dispose();
  });

  it('uses one fixed pose when reduced motion is requested', () => {
    const renderer = createRenderer();
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(true),
      now: () => 0,
      random: () => 0.5,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.loop).toBeNull();

    runtime.dispose();
  });

  it('pauses while hidden and resumes without leaking resources', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const media = createMatchMedia(false);
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => media,
      now: () => currentTime,
      random: () => 0.5,
    });

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(renderer.loop).toBeNull();

    currentTime = 5_000;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(renderer.loop).toEqual(expect.any(Function));

    runtime.dispose();
    runtime.dispose();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('preserves the initial pose when the page starts hidden', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
      random: () => 0.5,
    });
    const scene = renderer.render.mock.calls[0]?.[0];
    const triangle = scene?.children.find((child) => child.type === 'Group');
    const initialQuaternion = triangle?.quaternion.clone();

    currentTime = 20_000;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    renderer.loop?.(currentTime);

    expect(triangle?.quaternion.angleTo(initialQuaternion!)).toBeLessThan(0.0000001);
    runtime.dispose();
  });

  it('starts immediately after reduced motion is disabled while hidden', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const media = createMatchMedia(true);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => media,
      now: () => currentTime,
      random: () => 0.5,
    });
    const scene = renderer.render.mock.calls[0]?.[0];
    const triangle = scene?.children.find((child) => child.type === 'Group');
    const initialQuaternion = triangle?.quaternion.clone();

    currentTime = 1_000_000;
    media.setMatches(false);
    currentTime = 1_001_000;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    currentTime = 1_020_000;
    renderer.loop?.(1_020_000);

    expect(triangle?.quaternion.angleTo(initialQuaternion!)).toBeGreaterThan(0.1);
    runtime.dispose();
  });

  it('cleans up renderer resources and listeners when the first frame fails', () => {
    const renderer = createRenderer();
    const media = createMatchMedia(false);
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    renderer.render.mockImplementationOnce(() => {
      throw new Error('first frame failed');
    });

    expect(() =>
      createTriangle3DRuntime(document.createElement('canvas'), {
        createRenderer: () => renderer,
        matchMedia: () => media,
        now: () => 1_000,
        random: () => 0.5,
      }),
    ).toThrow('first frame failed');

    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
