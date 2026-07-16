import { Group, OrthographicCamera, Scene } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_SHAPE_DESCRIPTORS } from '../../config';
import type { GlobalBackgroundObject } from '../global-background3d';
import { createGlobalBackground3DRuntime } from '../global-background3d-runtime';

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
    render: vi.fn((_scene?: Scene, _camera?: OrthographicCamera) => undefined),
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

function createObjects() {
  return GLOBAL_SHAPE_DESCRIPTORS.map(
    (descriptor): GlobalBackgroundObject => ({
      id: descriptor.id,
      group: new Group(),
      outlineMaterial: new LineMaterial(),
      dispose: vi.fn(),
    }),
  );
}

function setViewport(width: number, height: number, dpr = 1) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: dpr });
}

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  setViewport(1024, 768, 1);
  vi.restoreAllMocks();
});

describe('global background 3d runtime', () => {
  it('renders one complete first frame before reporting ready', () => {
    const renderer = createRenderer();
    const objects = createObjects();
    const onReady = vi.fn();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => 1_000,
      onReady,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(onReady).toHaveBeenCalledOnce();
    expect(renderer.loop).toEqual(expect.any(Function));
    const scene = renderer.render.mock.calls[0]?.[0];
    expect(scene?.children.filter((child) => child.type === 'Group')).toHaveLength(6);

    runtime.dispose();
  });

  it('caps desktop DPR and throttles rendering to 30 FPS using the runtime clock', () => {
    setViewport(1440, 900, 3);
    let currentTime = 1_000;
    const renderer = createRenderer();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
    });

    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    currentTime = 1_010;
    renderer.loop?.(99_010);
    currentTime = 1_034;
    renderer.loop?.(99_034);
    currentTime = 1_040;
    renderer.loop?.(99_040);
    expect(renderer.render).toHaveBeenCalledTimes(2);

    runtime.dispose();
  });

  it('caps narrow DPR and throttles rendering to 24 FPS', () => {
    setViewport(390, 844, 3);
    let currentTime = 1_000;
    const renderer = createRenderer();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
    });

    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.25);
    currentTime = 1_040;
    renderer.loop?.(4_000_000);
    currentTime = 1_042;
    renderer.loop?.(4_000_002);
    expect(renderer.render).toHaveBeenCalledTimes(2);

    runtime.dispose();
  });

  it('updates camera, renderer, and all outline resolutions on resize without replacing objects', () => {
    setViewport(1440, 900, 2);
    const renderer = createRenderer();
    const objects = createObjects();
    const groups = objects.map(({ group }) => group);
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => 1_000,
    });

    setViewport(390, 844, 3);
    window.dispatchEvent(new Event('resize'));
    const camera = renderer.render.mock.calls.at(-1)?.[1];

    expect(renderer.setSize).toHaveBeenLastCalledWith(390, 844, false);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(1.25);
    expect(camera?.left).toBeCloseTo(-184.8341, 4);
    expect(camera?.right).toBeCloseTo(184.8341, 4);
    objects.forEach((object, index) => {
      expect(object.group).toBe(groups[index]);
      expect(object.outlineMaterial.resolution.toArray()).toEqual([390, 844]);
    });

    runtime.dispose();
  });

  it('renders one static pose when reduced motion is active and starts cleanly when disabled', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const media = createMatchMedia(true);
    const objects = createObjects();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => media,
      now: () => currentTime,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.loop).toBeNull();

    currentTime = 1_000_000;
    media.setMatches(false);
    expect(renderer.loop).toEqual(expect.any(Function));
    const base = objects[0]?.group.position.clone();
    currentTime = 1_000_010;
    renderer.loop?.(123);
    expect(objects[0]?.group.position.distanceTo(base!)).toBeLessThan(1);

    runtime.dispose();
  });

  it('pauses hidden time so the scene resumes without jumping', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const objects = createObjects();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
    });

    currentTime = 2_000;
    renderer.loop?.(2_000);
    const beforeHidden = objects[0]?.group.position.clone();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(renderer.loop).toBeNull();

    currentTime = 102_000;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    currentTime = 102_034;
    renderer.loop?.(102_034);
    expect(objects[0]?.group.position.distanceTo(beforeHidden!)).toBeLessThan(1);

    runtime.dispose();
  });

  it('cleans up listeners, objects, and renderer when the first frame fails', () => {
    const renderer = createRenderer();
    const objects = createObjects();
    const media = createMatchMedia(false);
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const canvas = document.createElement('canvas');
    const removeCanvas = vi.spyOn(canvas, 'removeEventListener');
    renderer.render.mockImplementationOnce(() => {
      throw new Error('first frame failed');
    });

    expect(() =>
      createGlobalBackground3DRuntime(canvas, {
        createObjects: () => objects,
        createRenderer: () => renderer,
        matchMedia: () => media,
        now: () => 1_000,
      }),
    ).toThrow('first frame failed');

    expect(renderer.dispose).toHaveBeenCalledOnce();
    objects.forEach((object) => expect(object.dispose).toHaveBeenCalledOnce());
    expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removeCanvas).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
  });

  it('falls back without leaking when an animation render fails after ready', () => {
    let currentTime = 1_000;
    const renderer = createRenderer();
    const objects = createObjects();
    const onUnavailable = vi.fn();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => currentTime,
      onUnavailable,
    });
    renderer.render.mockImplementationOnce(() => {
      throw new Error('animation render failed');
    });

    currentTime = 1_034;
    expect(() => renderer.loop?.(99_034)).not.toThrow();
    runtime.dispose();

    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(renderer.loop).toBeNull();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    objects.forEach((object) => expect(object.dispose).toHaveBeenCalledOnce());
  });

  it('falls back without leaking when a resize fails after ready', () => {
    const renderer = createRenderer();
    const objects = createObjects();
    const onUnavailable = vi.fn();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => 1_000,
      onUnavailable,
    });
    renderer.setSize.mockImplementationOnce(() => {
      throw new Error('resize failed');
    });

    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
    runtime.dispose();

    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(renderer.loop).toBeNull();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    objects.forEach((object) => expect(object.dispose).toHaveBeenCalledOnce());
  });

  it('falls back and disposes once when the WebGL context is lost', () => {
    const renderer = createRenderer();
    const objects = createObjects();
    const onUnavailable = vi.fn();
    const canvas = document.createElement('canvas');
    const runtime = createGlobalBackground3DRuntime(canvas, {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => 1_000,
      onUnavailable,
    });
    const event = new Event('webglcontextlost', { cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    canvas.dispatchEvent(event);
    runtime.dispose();

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(renderer.loop).toBeNull();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    objects.forEach((object) => expect(object.dispose).toHaveBeenCalledOnce());
  });

  it('makes normal disposal idempotent', () => {
    const renderer = createRenderer();
    const objects = createObjects();
    const runtime = createGlobalBackground3DRuntime(document.createElement('canvas'), {
      createObjects: () => objects,
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(false),
      now: () => 1_000,
    });

    runtime.dispose();
    runtime.dispose();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    objects.forEach((object) => expect(object.dispose).toHaveBeenCalledOnce());
  });
});
