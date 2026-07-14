import { DirectionalLight, Euler, HemisphereLight, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import {
  STATIC_ROTATION,
  calculateCoverFrustum,
  createRandomRotationTarget,
  createTriangleObject,
  easeInOutQuint,
} from './triangle3d';

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
    options.createRenderer ??
    ((target) => new WebGLRenderer({ canvas: target, alpha: true, antialias: true, powerPreference: 'low-power' }));
  const matchMedia = options.matchMedia ?? window.matchMedia.bind(window);
  const now = options.now ?? performance.now.bind(performance);
  const random = options.random ?? Math.random;
  const renderer = createRenderer(canvas);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-700, 700, 400, -400, 0.1, 1000);
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  const triangle = createTriangleObject();
  triangle.group.quaternion.setFromEuler(new Euler(STATIC_ROTATION.x, STATIC_ROTATION.y, STATIC_ROTATION.z, 'XYZ'));
  scene.add(triangle.group);
  scene.add(new HemisphereLight(0xffffff, 0xd99088, 1.4));
  const keyLight = new DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(-200, 260, 420);
  scene.add(keyLight);

  let disposed = false;
  let currentZ = STATIC_ROTATION.z;
  let from = triangle.group.quaternion.clone();
  let target = createRandomRotationTarget(currentZ, random);
  let segmentStartedAt = now();
  let lastRenderedAt = Number.NEGATIVE_INFINITY;
  let pausedAt: number | null = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

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

  function animate(time: number) {
    if (disposed || time - lastRenderedAt < 1000 / 30) return;
    lastRenderedAt = time;
    const progress = Math.min(1, (time - segmentStartedAt) / target.durationMs);
    triangle.group.quaternion.slerpQuaternions(from, target.quaternion, easeInOutQuint(progress));
    render();

    if (progress === 1) {
      currentZ = target.zRadians;
      from = triangle.group.quaternion.clone();
      target = createRandomRotationTarget(currentZ, random);
      segmentStartedAt = time;
    }
  }

  function syncAnimationLoop() {
    renderer.setAnimationLoop(!disposed && !document.hidden && !reducedMotion.matches ? animate : null);
  }

  function onVisibilityChange() {
    if (document.hidden) pausedAt = now();
    else if (pausedAt !== null) {
      segmentStartedAt += now() - pausedAt;
      pausedAt = null;
    }
    syncAnimationLoop();
  }

  function onReducedMotionChange() {
    if (reducedMotion.matches) {
      currentZ = STATIC_ROTATION.z;
      triangle.group.quaternion.setFromEuler(new Euler(STATIC_ROTATION.x, STATIC_ROTATION.y, STATIC_ROTATION.z, 'XYZ'));
      render();
    } else {
      from = triangle.group.quaternion.clone();
      target = createRandomRotationTarget(currentZ, random);
      segmentStartedAt = now();
    }
    syncAnimationLoop();
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotion.addEventListener('change', onReducedMotionChange);
  resize();
  render();
  options.onReady?.();
  syncAnimationLoop();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener('change', onReducedMotionChange);
      triangle.dispose();
      renderer.dispose();
    },
  };
}
