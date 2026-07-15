import { DirectionalLight, Euler, HemisphereLight, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { STATIC_ROTATION, TRIANGLE_WORLD_POSITION, calculateContinuousPose, calculateCoverFrustum, createMotionProfile, createTriangleObject } from './triangle3d';

export interface RendererAdapter {
  outputColorSpace: string;
  dispose(): void;
  render(scene: Scene, camera: OrthographicCamera): void;
  setAnimationLoop(callback: ((time: number) => void) | null): void;
  setClearColor(color: number, alpha: number): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
}

export interface Triangle3DRuntimeOptions {
  createRenderer?: (canvas: HTMLCanvasElement) => RendererAdapter;
  matchMedia?: (query: string) => MediaQueryList;
  now?: () => number;
  onReady?: () => void;
  random?: () => number;
}

export interface Triangle3DRuntime {
  dispose(): void;
}

export function createTriangle3DRuntime(canvas: HTMLCanvasElement, options: Triangle3DRuntimeOptions = {}): Triangle3DRuntime {
  const createRenderer: NonNullable<Triangle3DRuntimeOptions['createRenderer']> =
    options.createRenderer ?? ((target) => new WebGLRenderer({ canvas: target, alpha: true, antialias: true, powerPreference: 'low-power' }));
  const matchMedia = options.matchMedia ?? window.matchMedia.bind(window);
  const now = options.now ?? performance.now.bind(performance);
  const random = options.random ?? Math.random;
  const renderer = createRenderer(canvas);
  let disposed = false;
  let ownedTriangle: ReturnType<typeof createTriangleObject> | undefined;
  let ownedReducedMotion: MediaQueryList | undefined;
  let resizeAttached = false;
  let visibilityAttached = false;
  let reducedMotionAttached = false;
  let resizeHandler: (() => void) | undefined;
  let visibilityHandler: (() => void) | undefined;
  let reducedMotionHandler: (() => void) | undefined;

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
    if (reducedMotionAttached && reducedMotionHandler && ownedReducedMotion) attempt(() => ownedReducedMotion.removeEventListener('change', reducedMotionHandler));
    if (ownedTriangle) attempt(() => ownedTriangle.dispose());
    attempt(() => renderer.dispose());
    if (cleanupError && !suppressErrors) throw cleanupError;
  }

  try {
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new OrthographicCamera(-700, 700, 400, -400, 0.1, 1000);
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);

    ownedTriangle = createTriangleObject();
    const triangle = ownedTriangle;
    triangle.group.quaternion.setFromEuler(new Euler(STATIC_ROTATION.x, STATIC_ROTATION.y, STATIC_ROTATION.z, 'XYZ'));
    scene.add(triangle.group);
    scene.add(new HemisphereLight(0xffffff, 0xf7d7d3, 1.7));
    const keyLight = new DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(-200, 260, 420);
    scene.add(keyLight);

    const motionProfile = createMotionProfile(random);
    let motionStartedAt = now();
    let lastRenderedAt = Number.NEGATIVE_INFINITY;
    let pausedAt: number | null = document.hidden ? motionStartedAt : null;
    ownedReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const reducedMotion = ownedReducedMotion;

    function resize() {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const frustum = calculateCoverFrustum(width, height);
      camera.left = frustum.left;
      camera.right = frustum.right;
      camera.top = frustum.top;
      camera.bottom = frustum.bottom;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      triangle.outlineMaterial.resolution.set(width, height);
    }

    function render() {
      renderer.render(scene, camera);
    }

    function applyStaticPose() {
      triangle.group.position.set(TRIANGLE_WORLD_POSITION.x, TRIANGLE_WORLD_POSITION.y, TRIANGLE_WORLD_POSITION.z);
      triangle.group.quaternion.setFromEuler(new Euler(STATIC_ROTATION.x, STATIC_ROTATION.y, STATIC_ROTATION.z, 'XYZ'));
    }

    function applyMotionPose(time: number) {
      const pose = calculateContinuousPose(time - motionStartedAt, motionProfile);
      triangle.group.position.set(pose.position.x, pose.position.y, pose.position.z);
      triangle.group.quaternion.setFromEuler(new Euler(pose.rotation.x, pose.rotation.y, pose.rotation.z, 'XYZ'));
    }

    function animate() {
      const time = now();
      if (disposed || time - lastRenderedAt < 1000 / 30) return;
      lastRenderedAt = time;
      applyMotionPose(time);
      render();
    }

    function syncAnimationLoop() {
      renderer.setAnimationLoop(!disposed && !document.hidden && !reducedMotion.matches ? animate : null);
    }

    function onVisibilityChange() {
      if (document.hidden) pausedAt = now();
      else if (pausedAt !== null) {
        motionStartedAt += now() - pausedAt;
        pausedAt = null;
      }
      syncAnimationLoop();
    }

    function onReducedMotionChange() {
      if (reducedMotion.matches) {
        applyStaticPose();
        render();
      } else {
        motionStartedAt = now();
        applyMotionPose(motionStartedAt);
        if (document.hidden) pausedAt = motionStartedAt;
      }
      syncAnimationLoop();
    }

    resizeHandler = resize;
    visibilityHandler = onVisibilityChange;
    reducedMotionHandler = onReducedMotionChange;
    window.addEventListener('resize', resize, { passive: true });
    resizeAttached = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    visibilityAttached = true;
    reducedMotion.addEventListener('change', onReducedMotionChange);
    reducedMotionAttached = true;
    resize();
    render();
    options.onReady?.();
    syncAnimationLoop();

    return { dispose: cleanup };
  } catch (error) {
    cleanup(true);
    throw error;
  }
}
