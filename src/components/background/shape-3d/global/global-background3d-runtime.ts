import { DirectionalLight, HemisphereLight, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { GLOBAL_SHAPE_DESCRIPTORS } from '../config/global-background3d.config';
import {
  calculateCoverFrustum,
  calculateGlobalBackgroundPose,
  createGlobalBackgroundObjects,
  getGlobalRenderingProfile,
  type GlobalBackgroundObject,
} from './global-background3d';

export interface RendererAdapter {
  outputColorSpace: string;
  dispose(): void;
  render(scene: Scene, camera: OrthographicCamera): void;
  setAnimationLoop(callback: ((time: number) => void) | null): void;
  setClearColor(color: number, alpha: number): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
}

export interface GlobalBackground3DRuntimeOptions {
  createObjects?: () => GlobalBackgroundObject[];
  createRenderer?: (canvas: HTMLCanvasElement) => RendererAdapter;
  matchMedia?: (query: string) => MediaQueryList;
  now?: () => number;
  onReady?: () => void;
  onUnavailable?: () => void;
}

export interface GlobalBackground3DRuntime {
  dispose(): void;
}

export function createGlobalBackground3DRuntime(
  canvas: HTMLCanvasElement,
  options: GlobalBackground3DRuntimeOptions = {},
): GlobalBackground3DRuntime {
  const createRenderer: NonNullable<GlobalBackground3DRuntimeOptions['createRenderer']> =
    options.createRenderer ?? ((target) => new WebGLRenderer({ canvas: target, alpha: true, antialias: true, powerPreference: 'low-power' }));
  const createObjects = options.createObjects ?? createGlobalBackgroundObjects;
  const matchMedia = options.matchMedia ?? window.matchMedia.bind(window);
  const now = options.now ?? performance.now.bind(performance);
  const renderer = createRenderer(canvas);
  let disposed = false;
  let objects: GlobalBackgroundObject[] = [];
  let reducedMotion: MediaQueryList | undefined;
  let resizeAttached = false;
  let visibilityAttached = false;
  let reducedMotionAttached = false;
  let contextLossAttached = false;
  let resizeHandler: (() => void) | undefined;
  let visibilityHandler: (() => void) | undefined;
  let reducedMotionHandler: (() => void) | undefined;
  let contextLossHandler: ((event: Event) => void) | undefined;

  function cleanup(suppressErrors = false) {
    if (disposed) return;
    disposed = true;
    let cleanupError: unknown;
    const attempt = (operation: () => void) => {
      try {
        operation();
      } catch (error) {
        cleanupError ??= error;
      }
    };

    attempt(() => renderer.setAnimationLoop(null));
    if (resizeAttached && resizeHandler) attempt(() => window.removeEventListener('resize', resizeHandler));
    if (visibilityAttached && visibilityHandler) attempt(() => document.removeEventListener('visibilitychange', visibilityHandler));
    if (reducedMotionAttached && reducedMotionHandler && reducedMotion) {
      attempt(() => reducedMotion.removeEventListener('change', reducedMotionHandler));
    }
    if (contextLossAttached && contextLossHandler) attempt(() => canvas.removeEventListener('webglcontextlost', contextLossHandler));
    objects.reverse().forEach((object) => attempt(() => object.dispose()));
    attempt(() => renderer.dispose());
    if (cleanupError && !suppressErrors) throw cleanupError;
  }

  function failAfterReady() {
    if (disposed) return;
    try {
      options.onUnavailable?.();
    } catch {
      // The fallback notification must never prevent resource cleanup.
    }
    cleanup(true);
  }

  function guardAfterReady(operation: () => void) {
    if (disposed) return;
    try {
      operation();
    } catch {
      failAfterReady();
    }
  }

  try {
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new OrthographicCamera(-700, 700, 400, -400, 0.1, 1000);
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);

    objects = createObjects();
    const descriptors = new Map(GLOBAL_SHAPE_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]));
    objects.forEach((object) => {
      if (!descriptors.has(object.id)) throw new Error(`[global-background3d] unknown object id: ${object.id}`);
      scene.add(object.group);
    });
    if (objects.length !== GLOBAL_SHAPE_DESCRIPTORS.length) {
      throw new Error(`[global-background3d] expected ${GLOBAL_SHAPE_DESCRIPTORS.length} objects, received ${objects.length}`);
    }

    scene.add(new HemisphereLight(0xffffff, 0xcad8e8, 1.55));
    const keyLight = new DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(-240, 280, 440);
    scene.add(keyLight);

    let profile = getGlobalRenderingProfile(window.innerWidth);
    let motionStartedAt = now();
    let lastRenderedAt = Number.NEGATIVE_INFINITY;
    let pausedAt: number | null = document.hidden ? motionStartedAt : null;
    reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const frustum = calculateCoverFrustum(width, height);
      profile = getGlobalRenderingProfile(width);
      camera.left = frustum.left;
      camera.right = frustum.right;
      camera.top = frustum.top;
      camera.bottom = frustum.bottom;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.dprCap));
      renderer.setSize(width, height, false);
      objects.forEach((object) => object.outlineMaterial.resolution.set(width, height));
    }

    function applyPose(time: number, staticPose = reducedMotion?.matches ?? false) {
      const elapsed = Math.max(0, time - motionStartedAt);
      objects.forEach((object) => {
        const descriptor = descriptors.get(object.id);
        if (!descriptor) return;
        const pose = calculateGlobalBackgroundPose(descriptor, elapsed, window.innerWidth, staticPose);
        object.group.position.set(pose.position.x, pose.position.y, pose.position.z);
        object.group.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, 'XYZ');
      });
    }

    function render(time: number, staticPose = reducedMotion?.matches ?? false) {
      applyPose(time, staticPose);
      renderer.render(scene, camera);
      lastRenderedAt = time;
    }

    function animate() {
      const time = now();
      if (disposed || time - lastRenderedAt < 1000 / profile.fps) return;
      guardAfterReady(() => render(time, false));
    }

    function syncAnimationLoop() {
      renderer.setAnimationLoop(!disposed && !document.hidden && !reducedMotion?.matches ? animate : null);
    }

    function onResize() {
      guardAfterReady(() => {
        resize();
        render(now());
      });
    }

    function onVisibilityChange() {
      guardAfterReady(() => {
        if (document.hidden) {
          pausedAt = now();
        } else if (pausedAt !== null) {
          motionStartedAt += now() - pausedAt;
          pausedAt = null;
        }
        syncAnimationLoop();
      });
    }

    function onReducedMotionChange() {
      guardAfterReady(() => {
        const time = now();
        if (reducedMotion?.matches) {
          render(time, true);
        } else {
          motionStartedAt = time;
          pausedAt = document.hidden ? time : null;
          render(time, false);
        }
        syncAnimationLoop();
      });
    }

    function onContextLost(event: Event) {
      if (disposed) return;
      try {
        event.preventDefault();
      } finally {
        failAfterReady();
      }
    }

    resizeHandler = onResize;
    visibilityHandler = onVisibilityChange;
    reducedMotionHandler = onReducedMotionChange;
    contextLossHandler = onContextLost;
    window.addEventListener('resize', onResize, { passive: true });
    resizeAttached = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    visibilityAttached = true;
    reducedMotion.addEventListener('change', onReducedMotionChange);
    reducedMotionAttached = true;
    canvas.addEventListener('webglcontextlost', onContextLost);
    contextLossAttached = true;

    resize();
    render(now());
    syncAnimationLoop();
    options.onReady?.();

    return { dispose: cleanup };
  } catch (error) {
    cleanup(true);
    throw error;
  }
}
