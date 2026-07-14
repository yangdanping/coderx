# Background Triangle 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the pink triangle in the global SVG background with a softly shaded, outlined, slowly rotating 3D triangular plaque while preserving the existing SVG shapes and paper-grain layer.

**Architecture:** Keep `bg.svg` as the bottom decorative layer, render the triangle in a transparent Three.js canvas above it, and keep the existing paper-noise pseudo-element above both. Split pure geometry/motion/camera math from the browser renderer lifecycle; keep the Vue SFC as a thin mount/fallback boundary.

**Tech Stack:** Vue 3.5 Composition API with `<script setup lang="ts">`, Three.js 0.185.1, `@types/three` 0.185.1, Vitest 4, Vue Test Utils, SCSS, pnpm 11.

## Global Constraints

- Migrate only the pink triangle; all other SVG geometry remains unchanged.
- Preserve the original `1400 × 800` SVG viewBox and CSS `center / cover` framing.
- Use an orthographic camera, 14 viewBox-unit total depth, 3-unit bevel, 4 bevel segments, and no perspective scale distortion.
- Cap and side colors remain `#f3b2ac` / `#e99289` with opacity `0.50` / `0.58`; outline remains `#ee675c` at `0.80` opacity and 1.5 CSS px.
- Rotation segments last 18–28 seconds; X/Y stay within ±35° with at least one axis tilted by 12°; Z changes by 35–110° in either direction.
- Cap device pixel ratio at 1.5, render at most 30 FPS, pause while the document is hidden, and render a static shallow pose for `prefers-reduced-motion: reduce`.
- Keep a two-dimensional inline SVG fallback visible until the first successful WebGL frame and whenever WebGL initialization fails.
- Apply `var(--bg-filter)` to the 3D layer so dark mode attenuates SVG and WebGL consistently.
- Do not add interaction, parallax, shadows, post-processing, transmission, bloom, or migrate other shapes.

---

## File Structure

```text
src/components/background/triangle-3d/
├── BackgroundTriangle3D.vue       # Decorative DOM boundary and SVG fallback
├── triangle3d.ts                  # Geometry, materials, camera math, motion targets
├── triangle3d-runtime.ts          # Renderer, scene, animation, resize and cleanup
└── test/
    ├── BackgroundTriangle3D.test.ts
    ├── triangle3d.test.ts
    └── triangle3d-runtime.test.ts

src/assets/img/bg.svg              # Remove only the original triangle path
src/assets/img/test/bg-svg-contract.test.ts
src/assets/css/test/common-background.test.ts
src/App.vue                        # Mount component and assign semantic background z-layers
package.json                       # Add matching Three.js type declarations
pnpm-lock.yaml                     # Lock @types/three 0.185.1
```

Component map:

- `App.vue`: app-shell composition only; mounts the decorative background component.
- `BackgroundTriangle3D.vue`: owns the canvas/fallback DOM and connects Vue mount/unmount to the renderer controller; no geometry math.
- `triangle3d-runtime.ts`: owns opaque Three.js/browser state and returns one `dispose()` boundary.
- `triangle3d.ts`: deterministic, independently testable helpers; no window, document, or Vue dependency.

---

### Task 1: Implement deterministic triangle geometry, cover framing, and motion targets

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/components/background/triangle-3d/triangle3d.ts`
- Create: `src/components/background/triangle-3d/test/triangle3d.test.ts`

**Interfaces:**
- Consumes: Three.js core and wide-line addons from `three/addons/lines/*`.
- Produces: `createTriangleObject()`, `calculateCoverFrustum()`, `createRandomRotationTarget()`, `easeInOutQuint()`, `TRIANGLE_WORLD_POSITION`, and `STATIC_ROTATION` for the renderer task.

- [ ] **Step 1: Add matching Three.js declarations**

Run:

```bash
pnpm add -D @types/three@0.185.1
```

Expected: `package.json` adds `@types/three` under `devDependencies`; `pnpm-lock.yaml` resolves version `0.185.1`.

- [ ] **Step 2: Write the failing geometry and motion tests**

Create `src/components/background/triangle-3d/test/triangle3d.test.ts`:

```ts
import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  STATIC_ROTATION,
  TRIANGLE_TOTAL_DEPTH,
  TRIANGLE_WORLD_POSITION,
  calculateCoverFrustum,
  createRandomRotationTarget,
  createTriangleObject,
  easeInOutQuint,
} from '../triangle3d';

describe('triangle3d scene model', () => {
  it('builds the original rounded silhouette as a 14-unit deep centered object', () => {
    const object = createTriangleObject();
    const bounds = new Box3().setFromObject(object.group);
    const size = bounds.getSize(new Vector3());

    expect(size.x).toBeGreaterThanOrEqual(110);
    expect(size.y).toBeGreaterThanOrEqual(96);
    expect(size.z).toBeCloseTo(TRIANGLE_TOTAL_DEPTH, 4);
    expect(TRIANGLE_WORLD_POSITION).toEqual({ x: -482.5, y: -130, z: 0 });
    expect(object.outlineMaterial.linewidth).toBe(1.5);

    const disposeSpies = object.disposables.map((resource) => vi.spyOn(resource, 'dispose'));
    object.dispose();
    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it.each([
    [1400, 800, { left: -700, right: 700, top: 400, bottom: -400 }],
    [1440, 900, { left: -640, right: 640, top: 400, bottom: -400 }],
  ])('matches center/cover framing at %d×%d', (width, height, expected) => {
    expect(calculateCoverFrustum(width, height)).toEqual(expected);
  });

  it('keeps random targets slow, tilted, and inside the safe viewing envelope', () => {
    const values = [0, 0.25, 0.5, 0.75, 1];
    let index = 0;
    const random = () => values[index++ % values.length] ?? 0;
    const target = createRandomRotationTarget(STATIC_ROTATION.z, random);

    expect(target.durationMs).toBeGreaterThanOrEqual(18_000);
    expect(target.durationMs).toBeLessThanOrEqual(28_000);
    expect(Math.abs(target.eulerDegrees.x)).toBeLessThanOrEqual(35);
    expect(Math.abs(target.eulerDegrees.y)).toBeLessThanOrEqual(35);
    expect(Math.max(Math.abs(target.eulerDegrees.x), Math.abs(target.eulerDegrees.y))).toBeGreaterThanOrEqual(12);
    expect(Math.abs(target.deltaZDegrees)).toBeGreaterThanOrEqual(35);
    expect(Math.abs(target.deltaZDegrees)).toBeLessThanOrEqual(110);
  });

  it('uses a clamped ease-in-out curve', () => {
    expect(easeInOutQuint(-1)).toBe(0);
    expect(easeInOutQuint(0)).toBe(0);
    expect(easeInOutQuint(0.5)).toBe(0.5);
    expect(easeInOutQuint(1)).toBe(1);
    expect(easeInOutQuint(2)).toBe(1);
  });
});
```

- [ ] **Step 3: Run the focused test and verify the red state**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d.test.ts
```

Expected: FAIL because `../triangle3d` does not exist.

- [ ] **Step 4: Implement the scene model**

Create `src/components/background/triangle-3d/triangle3d.ts` with these exact exports and responsibilities:

```ts
import {
  EdgesGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
} from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export const SVG_VIEWBOX = { width: 1400, height: 800 } as const;
export const TRIANGLE_TOTAL_DEPTH = 14;
export const TRIANGLE_WORLD_POSITION = { x: -482.5, y: -130, z: 0 } as const;
export const STATIC_ROTATION = {
  x: MathUtils.degToRad(12),
  y: MathUtils.degToRad(-18),
  z: MathUtils.degToRad(8),
} as const;

const CENTER = { x: 217.5, y: 530 } as const;
const BEVEL = 3;
const CORE_DEPTH = TRIANGLE_TOTAL_DEPTH - BEVEL * 2;

export interface CoverFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface RotationTarget {
  quaternion: Quaternion;
  durationMs: number;
  zRadians: number;
  deltaZDegrees: number;
  eulerDegrees: { x: number; y: number; z: number };
}

export interface TriangleObject {
  group: Group;
  outlineMaterial: LineMaterial;
  disposables: Array<{ dispose: () => void }>;
  dispose: () => void;
}

function localPoint(x: number, y: number): [number, number] {
  return [x - CENTER.x, CENTER.y - y];
}

function createTriangleShape() {
  const shape = new Shape();
  shape.moveTo(...localPoint(165, 580));
  shape.lineTo(...localPoint(270, 580));
  shape.quadraticCurveTo(...localPoint(275, 578), ...localPoint(270, 570));
  shape.lineTo(...localPoint(223, 483));
  shape.quadraticCurveTo(...localPoint(220, 480), ...localPoint(217, 483));
  shape.lineTo(...localPoint(165, 570));
  shape.quadraticCurveTo(...localPoint(160, 578), ...localPoint(165, 580));
  return shape;
}

export function createTriangleObject(): TriangleObject {
  const geometry = new ExtrudeGeometry(createTriangleShape(), {
    depth: CORE_DEPTH,
    bevelEnabled: true,
    bevelSize: BEVEL,
    bevelThickness: BEVEL,
    bevelSegments: 4,
    curveSegments: 16,
    steps: 1,
  });
  geometry.translate(0, 0, -CORE_DEPTH / 2);

  const capMaterial = new MeshStandardMaterial({
    color: '#f3b2ac',
    metalness: 0,
    opacity: 0.5,
    roughness: 0.95,
    transparent: true,
  });
  const sideMaterial = new MeshStandardMaterial({
    color: '#e99289',
    metalness: 0,
    opacity: 0.58,
    roughness: 0.95,
    transparent: true,
  });
  const mesh = new Mesh(geometry, [capMaterial, sideMaterial]);

  const edges = new EdgesGeometry(geometry, 30);
  const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);
  const outlineMaterial = new LineMaterial({
    color: '#ee675c',
    linewidth: 1.5,
    opacity: 0.8,
    transparent: true,
    worldUnits: false,
  });
  const outline = new LineSegments2(lineGeometry, outlineMaterial);

  const group = new Group();
  group.position.set(TRIANGLE_WORLD_POSITION.x, TRIANGLE_WORLD_POSITION.y, TRIANGLE_WORLD_POSITION.z);
  group.add(mesh, outline);

  const disposables = [geometry, capMaterial, sideMaterial, edges, lineGeometry, outlineMaterial];
  return {
    group,
    outlineMaterial,
    disposables,
    dispose: () => disposables.forEach((resource) => resource.dispose()),
  };
}

export function calculateCoverFrustum(width: number, height: number): CoverFrustum {
  const scale = Math.max(width / SVG_VIEWBOX.width, height / SVG_VIEWBOX.height);
  const visibleWidth = width / scale;
  const visibleHeight = height / scale;
  return {
    left: -visibleWidth / 2,
    right: visibleWidth / 2,
    top: visibleHeight / 2,
    bottom: -visibleHeight / 2,
  };
}

function range(random: () => number, min: number, max: number) {
  return min + (max - min) * Math.min(1, Math.max(0, random()));
}

export function createRandomRotationTarget(currentZRadians: number, random: () => number = Math.random): RotationTarget {
  let x = range(random, -35, 35);
  let y = range(random, -35, 35);
  if (Math.max(Math.abs(x), Math.abs(y)) < 12) {
    if (random() < 0.5) x = x < 0 ? -12 : 12;
    else y = y < 0 ? -12 : 12;
  }

  const direction = random() < 0.5 ? -1 : 1;
  const deltaZDegrees = direction * range(random, 35, 110);
  const zRadians = currentZRadians + MathUtils.degToRad(deltaZDegrees);
  const euler = new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), zRadians, 'XYZ');

  return {
    quaternion: new Quaternion().setFromEuler(euler),
    durationMs: range(random, 18_000, 28_000),
    zRadians,
    deltaZDegrees,
    eulerDegrees: { x, y, z: MathUtils.radToDeg(zRadians) },
  };
}

export function easeInOutQuint(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
}
```

- [ ] **Step 5: Run the focused test and verify the green state**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d.test.ts
```

Expected: 4 tests PASS. If actual `ExtrudeGeometry` bevel bounds differ, correct `CORE_DEPTH` so the measured total Z depth remains exactly 14 rather than weakening the assertion.

- [ ] **Step 6: Commit the scene model**

```bash
git add package.json pnpm-lock.yaml src/components/background/triangle-3d/triangle3d.ts src/components/background/triangle-3d/test/triangle3d.test.ts
git commit -m "feat(ui): add 3d background triangle model"
```

---

### Task 2: Implement the renderer and animation lifecycle

**Files:**
- Create: `src/components/background/triangle-3d/triangle3d-runtime.ts`
- Create: `src/components/background/triangle-3d/test/triangle3d-runtime.test.ts`

**Interfaces:**
- Consumes: all Task 1 exports; a real or injected renderer factory.
- Produces: `createTriangle3DRuntime(canvas, options)` returning `{ dispose(): void }`.

- [ ] **Step 1: Write lifecycle tests with an injected renderer**

Create `src/components/background/triangle-3d/test/triangle3d-runtime.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTriangle3DRuntime } from '../triangle3d-runtime';

function createMatchMedia(matches = false) {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList;
}

function createRenderer() {
  return {
    dispose: vi.fn(),
    render: vi.fn(),
    setAnimationLoop: vi.fn(),
    setClearColor: vi.fn(),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    outputColorSpace: '',
  };
}

describe('triangle 3d runtime', () => {
  it('renders once, starts animation, resizes, and releases browser resources', () => {
    const renderer = createRenderer();
    const media = createMatchMedia(false);
    const onReady = vi.fn();
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => media,
      now: () => 1_000,
      onReady,
      random: () => 0.5,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(expect.any(Function));
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(Math.min(window.devicePixelRatio || 1, 1.5));
    expect(onReady).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event('resize'));
    expect(renderer.setSize).toHaveBeenLastCalledWith(window.innerWidth, window.innerHeight, false);

    runtime.dispose();
    expect(renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('renders one fixed pose without starting a loop for reduced motion', () => {
    const renderer = createRenderer();
    const runtime = createTriangle3DRuntime(document.createElement('canvas'), {
      createRenderer: () => renderer,
      matchMedia: () => createMatchMedia(true),
      now: () => 0,
      random: () => 0.5,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.setAnimationLoop).not.toHaveBeenCalledWith(expect.any(Function));
    runtime.dispose();
  });
});
```

- [ ] **Step 2: Run the lifecycle test and verify the red state**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d-runtime.test.ts
```

Expected: FAIL because `../triangle3d-runtime` does not exist.

- [ ] **Step 3: Implement the runtime controller**

Create `src/components/background/triangle-3d/triangle3d-runtime.ts`. The complete implementation must:

```ts
import {
  DirectionalLight,
  Euler,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
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
  const createRenderer =
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
    Object.assign(camera, frustum);
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
```

- [ ] **Step 4: Run model and lifecycle tests**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d.test.ts src/components/background/triangle-3d/test/triangle3d-runtime.test.ts
```

Expected: all focused tests PASS with no WebGL context creation in jsdom.

- [ ] **Step 5: Type-check the runtime boundary**

Run:

```bash
pnpm type-check
```

Expected: PASS. Correct adapter property types or add-on imports rather than using `any` or disabling checks.

- [ ] **Step 6: Commit the renderer lifecycle**

```bash
git add src/components/background/triangle-3d/triangle3d-runtime.ts src/components/background/triangle-3d/test/triangle3d-runtime.test.ts
git commit -m "feat(ui): animate background triangle in 3d"
```

---

### Task 3: Mount the canvas, preserve fallback, and integrate global layers

**Files:**
- Create: `src/components/background/triangle-3d/BackgroundTriangle3D.vue`
- Create: `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts`
- Modify: `src/App.vue`
- Modify: `src/assets/img/bg.svg`
- Modify: `src/assets/img/test/bg-svg-contract.test.ts`
- Modify: `src/assets/css/test/common-background.test.ts`

**Interfaces:**
- Consumes: `createTriangle3DRuntime(canvas, { onReady })` from Task 2.
- Produces: a no-props, no-events decorative `BackgroundTriangle3D` component mounted by `App.vue`.

- [ ] **Step 1: Write failing component and layer contracts**

Create `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts`:

```ts
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import BackgroundTriangle3D from '../BackgroundTriangle3D.vue';

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  notifyReady: undefined as (() => void) | undefined,
}));

vi.mock('../triangle3d-runtime', () => ({
  createTriangle3DRuntime: vi.fn((_canvas, options) => {
    mocks.notifyReady = options.onReady;
    return { dispose: mocks.dispose };
  }),
}));

describe('BackgroundTriangle3D', () => {
  it('shows a non-interactive svg fallback until WebGL renders', async () => {
    const wrapper = mount(BackgroundTriangle3D);
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[data-triangle-fallback]').isVisible()).toBe(true);

    mocks.notifyReady?.();
    await nextTick();
    expect(wrapper.get('[data-triangle-fallback]').isVisible()).toBe(false);

    wrapper.unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
});
```

Extend `src/assets/img/test/bg-svg-contract.test.ts`:

```ts
it('moves only the pink triangle out of the svg background', () => {
  const source = readBgSvg();
  expect(source).not.toContain('rgb(243, 178, 172)');
  expect(source).toContain('rgba(26, 115, 232)');
  expect(source).toContain('rgba(190, 224, 198)');
  expect(source).toContain('rgba(253, 214, 99)');
});
```

Extend `src/assets/css/test/common-background.test.ts` to read the new component and assert:

```ts
expect(appVue).toMatch(/<BackgroundTriangle3D\s*\/>/);
expect(appVue).toMatch(/&::before\s*\{[\s\S]*?z-index:\s*-3/);
expect(backgroundTriangle).toMatch(/\.background-triangle-3d\s*\{[\s\S]*?z-index:\s*-2/);
expect(backgroundTriangle).toMatch(/filter:\s*var\(--bg-filter\)/);
expect(appVue).toMatch(/&::after\s*\{[\s\S]*?z-index:\s*-1/);
```

- [ ] **Step 2: Run component and contract tests to verify the red state**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts src/assets/img/test/bg-svg-contract.test.ts src/assets/css/test/common-background.test.ts
```

Expected: FAIL because the component does not exist and the triangle is still in `bg.svg`.

- [ ] **Step 3: Implement the thin Vue component with inline fallback**

Create `src/components/background/triangle-3d/BackgroundTriangle3D.vue`:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { createTriangle3DRuntime } from './triangle3d-runtime';

import type { Triangle3DRuntime } from './triangle3d-runtime';

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const isReady = shallowRef(false);
let runtime: Triangle3DRuntime | undefined;

onMounted(() => {
  if (!canvas.value) return;
  try {
    runtime = createTriangle3DRuntime(canvas.value, {
      onReady: () => {
        isReady.value = true;
      },
    });
  } catch {
    isReady.value = false;
  }
});

onUnmounted(() => {
  runtime?.dispose();
});
</script>

<template>
  <div class="background-triangle-3d" aria-hidden="true">
    <svg
      v-show="!isReady"
      class="background-triangle-3d__fallback"
      data-triangle-fallback
      viewBox="0 0 1400 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        d="M 165 580 L 270 580 Q275 578 270 570 L 223 483 Q220 480 217 483 L 165 570 Q160 578 165 580"
        fill="#f3b2ac"
        fill-opacity="0.5"
        stroke="#ee675c"
        stroke-opacity="0.8"
      />
    </svg>
    <canvas ref="canvas" class="background-triangle-3d__canvas" />
  </div>
</template>

<style scoped lang="scss">
.background-triangle-3d {
  position: fixed;
  z-index: -2;
  inset: 0;
  overflow: hidden;
  filter: var(--bg-filter);
  pointer-events: none;
  transition: filter 0.3s;
}

.background-triangle-3d__fallback,
.background-triangle-3d__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 4: Integrate semantic background layers**

In `src/App.vue`:

```vue
<script setup lang="ts">
import BackgroundTriangle3D from '@/components/background/triangle-3d/BackgroundTriangle3D.vue';
// keep all existing imports and script behavior
</script>

<template>
  <div class="app">
    <BackgroundTriangle3D />
    <!-- keep the existing nav, RouterView, backtop, and toaster content unchanged -->
  </div>
</template>
```

Change only the SVG pseudo-layer from `z-index: -2` to `z-index: -3`; leave paper noise at `-1`.

In `src/assets/img/bg.svg`, remove exactly the `<!-- 三角形 -->` comment and following pink `<path>...</path>` block. Do not reformat or edit the other shapes.

- [ ] **Step 5: Run component and layer contracts**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts src/assets/img/test/bg-svg-contract.test.ts src/assets/css/test/common-background.test.ts
```

Expected: all tests PASS; the fallback hides only after the ready callback and disposes on unmount.

- [ ] **Step 6: Run the full automated verification**

Run:

```bash
pnpm exec vitest run
pnpm type-check
pnpm build-only
```

Expected: all tests PASS, type-check exits 0, and Vite production build exits 0.

- [ ] **Step 7: Commit the integrated background component**

```bash
git add src/App.vue src/assets/img/bg.svg src/assets/img/test/bg-svg-contract.test.ts src/assets/css/test/common-background.test.ts src/components/background/triangle-3d/BackgroundTriangle3D.vue src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts
git commit -m "feat(ui): render background triangle in three dimensions"
```

---

### Task 4: Perform real-browser visual QA and final verification

**Files:**
- Modify if required by evidence: `src/components/background/triangle-3d/triangle3d.ts`
- Modify if required by evidence: `src/components/background/triangle-3d/triangle3d-runtime.ts`
- Modify corresponding tests whenever constants or behavior change.

**Interfaces:**
- Consumes: completed integrated component from Task 3.
- Produces: visually approved light/dark, desktop/mobile behavior with verification evidence.

- [ ] **Step 1: Start the development server**

Run:

```bash
pnpm dev --host 127.0.0.1
```

Expected: Vite reports a local URL and remains running.

- [ ] **Step 2: Inspect the actual page in a browser**

Use the in-app browser against the Vite URL and capture these states:

```text
1400 × 800, light theme: initial near-front pose
1440 × 900, light theme: first visibly tilted pose
1440 × 900, dark theme: same composition and attenuated color
390 × 844, current theme: cover crop matches the old SVG behavior
```

Observe at least two target transitions. Confirm there is no jump at a segment boundary, no prolonged edge-on disappearance, no strong specular highlight, and no doubled SVG triangle.

- [ ] **Step 3: Check reduced motion and background interaction**

Emulate `prefers-reduced-motion: reduce`, reload, and verify the triangle remains in one shallow 3D pose. Click, scroll, select text, and use keyboard navigation through page content to confirm the fixed layer never intercepts input.

- [ ] **Step 4: Tune only evidence-backed visual constants**

If browser evidence shows mismatch, adjust only these existing constants and keep their contract boundaries:

```ts
// triangle3d.ts
cap opacity: 0.45..0.55
side opacity: 0.52..0.62
outline width: 1.25..1.75 CSS px

// triangle3d-runtime.ts
HemisphereLight intensity: 1.0..1.6
DirectionalLight intensity: 1.1..1.8
```

Do not add new effects. Update tests if an exact asserted constant changes.

- [ ] **Step 5: Run final verification from a clean command invocation**

Run:

```bash
pnpm exec vitest run
pnpm type-check
pnpm build
git diff --check
git status --short
```

Expected: tests, type-check, and production build all exit 0; no whitespace errors; status contains only intentional feature changes or is clean after the final commit.

- [ ] **Step 6: Commit visual tuning, if any**

```bash
git add src/components/background/triangle-3d/triangle3d.ts src/components/background/triangle-3d/triangle3d-runtime.ts src/components/background/triangle-3d/test
git commit -m "style(ui): tune 3d triangle material and motion"
```

Skip this commit when visual QA required no code changes.
