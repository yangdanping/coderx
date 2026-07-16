# Global 3D Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six animated shapes from `bg.svg` with one responsive, theme-aware Three.js background scene while retaining the unchanged SVG as an exact failure/initial-load fallback and leaving the existing arrow byte-for-byte untouched.

**Architecture:** Add one `GlobalBackground3D` Vue component with one orthographic Three.js runtime that owns all six new objects. `App.vue` keeps the SVG pseudo-element below the new Canvas and crossfades it only after the runtime reports a successful first frame; the existing arrow remains its own independent component and Canvas.

**Tech Stack:** Vue 3.5 `<script setup>` with TypeScript, Three.js 0.185.1, SCSS, Vitest 4, Vue Test Utils, pnpm, Vite 8.

## Global Constraints

- Treat `docs/superpowers/specs/2026-07-16-global-3d-background-design.md` as the source of truth.
- Do not change any byte under `src/components/background/shape-3d/triangle/`; six fixed SHA-256 assertions enforce this.
- Do not modify `src/assets/img/bg.svg`; it remains the exact initial-load and failure fallback.
- Do not integrate the fixed `$` glyph or the retro-computer shader.
- Use one new renderer for all six objects; do not extract a shared arrow abstraction.
- Keep the existing `1400×800` center/cover coordinate system and original edge anchors.
- Desktop: DPR cap `1.5`, max `30fps`; width `<768px`: DPR cap `1.25`, max `24fps`.
- Large yellow/green objects self-spin without translation; small objects stay within 6–12 px and approximately ±6° before responsive scaling.
- Reduced motion is a stable one-frame scene; hidden tabs have no active loop and no elapsed-time jump on resume.
- Materials are module-owned: cap opacity `0.28`, side opacity `0.26`, outline opacity `0.42`, roughness `0.95`, metalness `0`.
- New implementation work follows test-driven development and ends each independently reviewable task with a commit.

## File Map

- Create `src/components/background/shape-3d/config/global-background3d.config.ts`: six typed descriptors plus shared material/performance constants.
- Modify `src/components/background/shape-3d/config/index.ts`: re-export the new module-owned configuration and types.
- Create `src/components/background/shape-3d/global/global-background3d.ts`: shape creation, extrusion, cap-only outlines, motion poses, responsive profile, and cover frustum.
- Create `src/components/background/shape-3d/global/global-background3d-runtime.ts`: renderer, scene, camera, timing, listeners, ready/unavailable callbacks, and cleanup.
- Create `src/components/background/shape-3d/global/GlobalBackground3D.vue`: Canvas lifecycle, ready styling, theme filter, and `ready-change` event.
- Create `src/components/background/shape-3d/global/test/global-background3d-config.test.ts`: descriptor/config contracts and triangle byte guard.
- Create `src/components/background/shape-3d/global/test/global-background3d.test.ts`: geometry, materials, outlines, poses, framing, responsive values, and disposal.
- Create `src/components/background/shape-3d/global/test/global-background3d-runtime.test.ts`: runtime timing, resize, reduced motion, failure, context loss, and cleanup.
- Create `src/components/background/shape-3d/global/test/GlobalBackground3D.test.ts`: component readiness/failure behavior.
- Modify `src/App.vue`: mount the new component and connect its readiness to SVG opacity/layering.
- Modify `src/assets/css/test/common-background.test.ts`: assert the new `-4/-3/-2/-1` stack and fallback crossfade contract.

---

### Task 1: Lock the arrow and define the global scene configuration

**Files:**
- Create: `src/components/background/shape-3d/config/global-background3d.config.ts`
- Modify: `src/components/background/shape-3d/config/index.ts`
- Create: `src/components/background/shape-3d/global/test/global-background3d-config.test.ts`

**Interfaces:**
- Produces: `GLOBAL_BACKGROUND_CONFIG`, `GLOBAL_SHAPE_DESCRIPTORS`, `GlobalShapeDescriptor`, `GlobalShapeId`, `GlobalMotionConfig`, and `GlobalGeometryConfig`.
- Consumes: no new-module interfaces.

- [ ] **Step 1: Write the failing configuration and byte-contract tests**

Create the test with the exact six IDs, role colors, performance values, material values, and SHA-256 map:

```ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOBAL_BACKGROUND_CONFIG, GLOBAL_SHAPE_DESCRIPTORS } from '../../config';

const triangleHashes = {
  'BackgroundTriangle3D.vue': '72e4647fcca3d93d27d7838c38e7fa30fa52d49e0665790b7a9da14e61c5c235',
  'triangle3d.ts': '385c0e197b08d02b583fca6604a98d6d725649fa159783d4933fc7235510d7cc',
  'triangle3d-runtime.ts': '12603ef8476034ded25791758db97ba307964cacfc645f78c60f82ce7d319841',
  'test/BackgroundTriangle3D.test.ts': 'ac659729a76bc9fa255f5b491b096673cea6b7b2295267585c8d0ae4f989c7de',
  'test/triangle3d.test.ts': '8232db2e23fc029d1d2dc869b35c8922936cbd6ec33ba3052d75eeaf4ba8ed9c',
  'test/triangle3d-runtime.test.ts': '21c891ba2d3466c8589c3c8f7f47005a9273d42cc1d06db014b30b9de9665c7b',
} as const;

const bgSvgHash = 'a7150f1cdf25d4dd59a6b029e50d3b799bd42e12427952944b348caf80402ad8';

describe('global 3d background configuration', () => {
  it('defines the six SVG-derived roles in stable order', () => {
    expect(GLOBAL_SHAPE_DESCRIPTORS.map(({ id, color, motion }) => ({ id, color, tier: motion.tier }))).toEqual([
      { id: 'blue-puck', color: '#1a73e8', tier: 'pace' },
      { id: 'neutral-puck', color: '#f1f3f4', tier: 'pace' },
      { id: 'green-slab', color: '#bee0c6', tier: 'spin' },
      { id: 'yellow-arch', color: '#fdd663', tier: 'spin' },
      { id: 'neutral-pill', color: '#f1f3f4', tier: 'pace' },
      { id: 'green-cube', color: '#bee0c6', tier: 'pace' },
    ]);
  });

  it('owns the approved material and rendering limits', () => {
    expect(GLOBAL_BACKGROUND_CONFIG.material).toEqual({
      capOpacity: 0.28,
      sideOpacity: 0.26,
      outlineOpacity: 0.42,
      outlineWidth: 1,
      roughness: 0.95,
      metalness: 0,
    });
    expect(GLOBAL_BACKGROUND_CONFIG.desktop).toEqual({ dprCap: 1.5, fps: 30, motionScale: 1, tiltScale: 1 });
    expect(GLOBAL_BACKGROUND_CONFIG.narrow).toEqual({ dprCap: 1.25, fps: 24, motionScale: 0.6, tiltScale: 0.75 });
    expect(GLOBAL_BACKGROUND_CONFIG.narrowMaxWidth).toBe(767);
  });

  it.each(Object.entries(triangleHashes))('keeps triangle file %s byte-for-byte unchanged', (relativePath, expected) => {
    const bytes = readFileSync(join(process.cwd(), 'src/components/background/shape-3d/triangle', relativePath));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected);
  });

  it('keeps the SVG fallback byte-for-byte unchanged', () => {
    const bytes = readFileSync(join(process.cwd(), 'src/assets/img/bg.svg'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(bgSvgHash);
  });
});
```

- [ ] **Step 2: Run the test and confirm the configuration import fails**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/global/test/global-background3d-config.test.ts
```

Expected: FAIL because `GLOBAL_BACKGROUND_CONFIG` and `GLOBAL_SHAPE_DESCRIPTORS` are not exported.

- [ ] **Step 3: Implement the typed module-owned configuration**

Create discriminated geometry and motion types. Use these exact world anchors, derived from the existing SVG's viewBox and initial edge regions:

```ts
export type GlobalShapeId = 'blue-puck' | 'neutral-puck' | 'green-slab' | 'yellow-arch' | 'neutral-pill' | 'green-cube';
export type GlobalGeometryConfig =
  | { kind: 'circle'; diameter: number }
  | { kind: 'rounded-rect'; width: number; height: number; radius: number }
  | { kind: 'arch'; width: number; arcHeight: number; baseHeight: number; baseRadius: number };

export type GlobalMotionConfig =
  | { tier: 'spin'; durationMs: number; turns: readonly [number, number, number] }
  | { tier: 'pace'; durationMs: number; phase: number; travel: readonly [number, number]; tiltDegrees: readonly [number, number, number] };

export interface GlobalShapeDescriptor {
  id: GlobalShapeId;
  color: string;
  depth: number;
  geometry: GlobalGeometryConfig;
  position: readonly [number, number, number];
  rotationDegrees: readonly [number, number, number];
  opacity: number;
  motion: GlobalMotionConfig;
}
```

Set the descriptor values to:

```ts
export const GLOBAL_SHAPE_DESCRIPTORS = [
  { id: 'blue-puck', color: '#1a73e8', depth: 14, geometry: { kind: 'circle', diameter: 60 }, position: [-720, 310, 0], rotationDegrees: [5, -7, -2], opacity: 0.72, motion: { tier: 'pace', durationMs: 15_000, phase: 0, travel: [12, 6], tiltDegrees: [6, 6, 3] } },
  { id: 'neutral-puck', color: '#f1f3f4', depth: 12, geometry: { kind: 'circle', diameter: 60 }, position: [500, -200, 0], rotationDegrees: [-4, 5, 1], opacity: 0.52, motion: { tier: 'pace', durationMs: 24_000, phase: Math.PI, travel: [10, 8], tiltDegrees: [5, 6, 2] } },
  { id: 'green-slab', color: '#bee0c6', depth: 32, geometry: { kind: 'rounded-rect', width: 300, height: 300, radius: 40 }, position: [750, -150, 0], rotationDegrees: [16, -12, 3], opacity: 1, motion: { tier: 'spin', durationMs: 108_000, turns: [-1, -1, -1] } },
  { id: 'yellow-arch', color: '#fdd663', depth: 28, geometry: { kind: 'arch', width: 300, arcHeight: 150, baseHeight: 20, baseRadius: 20 }, position: [350, 315, 0], rotationDegrees: [12, -16, -4], opacity: 1, motion: { tier: 'spin', durationMs: 92_000, turns: [1, 1, 1] } },
  { id: 'neutral-pill', color: '#f1f3f4', depth: 12, geometry: { kind: 'rounded-rect', width: 80, height: 160, radius: 40 }, position: [-420, -380, 0], rotationDegrees: [4, -5, -2], opacity: 0.4, motion: { tier: 'pace', durationMs: 22_000, phase: Math.PI / 2, travel: [10, 8], tiltDegrees: [5, 6, 3] } },
  { id: 'green-cube', color: '#bee0c6', depth: 20, geometry: { kind: 'rounded-rect', width: 100, height: 100, radius: 40 }, position: [-287, -313, 0], rotationDegrees: [-5, 5, -2], opacity: 0.68, motion: { tier: 'pace', durationMs: 19_000, phase: Math.PI * 1.5, travel: [10, 8], tiltDegrees: [6, 6, 2] } },
] as const satisfies readonly GlobalShapeDescriptor[];
```

Define the approved `material`, `desktop`, `narrow`, `narrowMaxWidth: 767`, and `viewBox: { width: 1400, height: 800 }` under `GLOBAL_BACKGROUND_CONFIG`, then re-export all values/types from `config/index.ts`.

- [ ] **Step 4: Run the focused test**

Run the command from Step 2.

Expected: PASS, including all six arrow hashes.

- [ ] **Step 5: Commit the configuration boundary**

```bash
git add src/components/background/shape-3d/config/global-background3d.config.ts src/components/background/shape-3d/config/index.ts src/components/background/shape-3d/global/test/global-background3d-config.test.ts
git commit -m "feat(ui): define global 3d background configuration"
```

### Task 2: Build the six extruded objects with cap-only outlines

**Files:**
- Create: `src/components/background/shape-3d/global/global-background3d.ts`
- Create: `src/components/background/shape-3d/global/test/global-background3d.test.ts`

**Interfaces:**
- Consumes: `GLOBAL_BACKGROUND_CONFIG`, `GLOBAL_SHAPE_DESCRIPTORS`, and `GlobalShapeDescriptor`.
- Produces: `createGlobalBackgroundObject(descriptor)`, `createGlobalBackgroundObjects()`, `GlobalBackgroundObject`, `calculateCoverFrustum()`, `calculateGlobalBackgroundPose()`, and `getGlobalRenderingProfile()`; Task 3 first consumes the object factory and later fills in the motion/framing functions in the same file.

- [ ] **Step 1: Write failing geometry/material/disposal tests**

Test each descriptor through `createGlobalBackgroundObject()` and assert:

```ts
const object = createGlobalBackgroundObject(descriptor);
const mesh = object.group.children.find((child) => child instanceof Mesh);
const outline = object.group.children.find((child) => child instanceof LineSegments2);
expect(mesh).toBeDefined();
expect(outline).toBeDefined();
expect(Array.from(mesh!.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
expect(new Box3().setFromObject(object.group).getSize(new Vector3()).z).toBeGreaterThanOrEqual(descriptor.depth);
```

Assert the local mesh is centered before the group-level world transform, material values equal `GLOBAL_BACKGROUND_CONFIG.material`, and outline endpoints always share Z:

```ts
const starts = outline!.geometry.getAttribute('instanceStart');
const ends = outline!.geometry.getAttribute('instanceEnd');
expect(starts.count).toBeGreaterThan(0);
for (let index = 0; index < starts.count; index += 1) {
  expect(starts.getZ(index)).toBeCloseTo(ends.getZ(index), 5);
}
```

Spy on geometry/material `dispose()` methods, call `object.dispose()` twice, and expect every resource to dispose once. Force `LineSegmentsGeometry.setPositions()` to throw and assert all earlier resources are released.

- [ ] **Step 2: Run the object tests and confirm the module is missing**

```bash
pnpm exec vitest run src/components/background/shape-3d/global/test/global-background3d.test.ts
```

Expected: FAIL because `global-background3d.ts` does not exist.

- [ ] **Step 3: Implement local shape construction and extrusion**

Implement one shape factory:

```ts
function createShape(config: GlobalGeometryConfig): Shape {
  const shape = new Shape();
  if (config.kind === 'circle') {
    shape.absarc(0, 0, config.diameter / 2, 0, Math.PI * 2, false);
    return shape;
  }
  if (config.kind === 'rounded-rect') return createRoundedRectShape(config.width, config.height, config.radius);
  return createArchShape(config.width, config.arcHeight, config.baseHeight, config.baseRadius);
}
```

`createRoundedRectShape()` must clamp radius to half the smallest side and use straight segments plus quadratic curves around a local `(0,0)` center. `createArchShape()` must construct a closed local path whose top is a half ellipse, whose base has the configured 20-unit thickness, and whose bottom corners use `baseRadius`; its bounding width is exactly `300` and height exactly `170` for `yellow-arch`.

Extrude each shape with bevel disabled, `curveSegments: 16`, `steps: 1`, translate Z to `[-depth/2, depth/2]`, and create separate `MeshStandardMaterial` instances for cap and side. Build `LineSegmentsGeometry` from boundary edges found only on the min/max Z caps. Use `LineMaterial` with `worldUnits: false`.

Set the group position and initial Euler rotation from the descriptor. Apply descriptor opacity as a multiplier to cap, side, and outline opacity. Return:

```ts
export interface GlobalBackgroundObject {
  id: GlobalShapeId;
  group: Group;
  outlineMaterial: LineMaterial;
  dispose(): void;
}

export function createGlobalBackgroundObjects(): GlobalBackgroundObject[];
```

Use a `disposed` flag and reverse cleanup on construction failure.

- [ ] **Step 4: Run object tests**

Run the command from Step 2.

Expected: PASS for all six geometries, cap-only outlines, module-owned materials, and disposal cases.

- [ ] **Step 5: Commit the six-object builder**

```bash
git add src/components/background/shape-3d/global/global-background3d.ts src/components/background/shape-3d/global/test/global-background3d.test.ts
git commit -m "feat(ui): build global 3d background objects"
```

### Task 3: Add deterministic motion, cover framing, and responsive profiles

**Files:**
- Modify: `src/components/background/shape-3d/global/global-background3d.ts`
- Modify: `src/components/background/shape-3d/global/test/global-background3d.test.ts`

**Interfaces:**
- Consumes: `GlobalShapeDescriptor` motion fields.
- Produces: `calculateGlobalBackgroundPose(descriptor, elapsedMs, viewportWidth, reducedMotion?)`, `calculateCoverFrustum(width, height)`, `getGlobalRenderingProfile(width)`, `GlobalBackgroundPose`, and `GlobalRenderingProfile` for the runtime.

- [ ] **Step 1: Add failing motion and framing tests**

Test landscape, tablet portrait, and mobile cover values with:

```ts
expect(calculateCoverFrustum(1400, 800)).toEqual({ left: -700, right: 700, top: 400, bottom: -400 });
expect(calculateCoverFrustum(390, 844)).toEqual({ left: expect.closeTo(-184.83, 1), right: expect.closeTo(184.83, 1), top: 400, bottom: -400 });
```

For each spin descriptor, compare `elapsedMs=0` and a quarter period: position must be identical and quaternion/rotation values must change. For each pace descriptor, sample 128 points over one period and assert the translation and tilt never exceed descriptor limits. Assert `reducedMotion=true` always returns the same static pose.

Assert profiles exactly:

```ts
expect(getGlobalRenderingProfile(768)).toEqual({ dprCap: 1.5, fps: 30, motionScale: 1, tiltScale: 1 });
expect(getGlobalRenderingProfile(767)).toEqual({ dprCap: 1.25, fps: 24, motionScale: 0.6, tiltScale: 0.75 });
```

- [ ] **Step 2: Run the focused tests and confirm missing exports**

Run Task 2's Vitest command.

Expected: FAIL because the pose, cover, and profile functions are not exported.

- [ ] **Step 3: Implement pure deterministic helpers**

Use the viewBox cover formula verbatim. Clamp width/height to at least `1`.

For spin objects, preserve descriptor position and compute each rotation as `initialRadians + progress * Math.PI * 2 * turns[axis]`.

For pace objects, use `phase = elapsedMs / durationMs * 2π + descriptor.phase`, then:

```ts
position.x = base.x + Math.sin(phase) * travelX * profile.motionScale;
position.y = base.y + Math.cos(phase) * travelY * profile.motionScale;
rotation.x = initial.x + degToRad(Math.sin(phase) * tiltX * profile.tiltScale);
rotation.y = initial.y + degToRad(Math.cos(phase) * tiltY * profile.tiltScale);
rotation.z = initial.z + degToRad(Math.sin(phase * 0.5) * tiltZ * profile.tiltScale);
```

When reduced motion is true, return the descriptor base position and initial rotation without consulting elapsed time.

- [ ] **Step 4: Run focused tests and commit**

Expected: PASS.

```bash
git add src/components/background/shape-3d/global/global-background3d.ts src/components/background/shape-3d/global/test/global-background3d.test.ts
git commit -m "feat(ui): add responsive background motion profiles"
```

### Task 4: Implement the shared runtime and failure lifecycle

**Files:**
- Create: `src/components/background/shape-3d/global/global-background3d-runtime.ts`
- Create: `src/components/background/shape-3d/global/test/global-background3d-runtime.test.ts`

**Interfaces:**
- Consumes: `createGlobalBackgroundObjects()`, `calculateGlobalBackgroundPose()`, `calculateCoverFrustum()`, and `getGlobalRenderingProfile()`.
- Produces: `createGlobalBackground3DRuntime(canvas, options?)` and `GlobalBackground3DRuntime { dispose(): void }`.

- [ ] **Step 1: Write a renderer adapter and failing lifecycle tests**

Define a test renderer with spies for `render`, `setAnimationLoop`, `setClearColor`, `setPixelRatio`, `setSize`, and `dispose`. Capture the active loop.

Cover these explicit cases:

1. First render succeeds, then `onReady` fires once and a loop is active.
2. At 1440 width, DPR is capped at 1.5 and rapid callbacks render no more than every `1000/30` ms.
3. At 390 width, DPR is capped at 1.25 and callbacks render no more than every `1000/24` ms.
4. Resize updates camera bounds, renderer size, and all six outline resolutions without replacing the six group instances.
5. Reduced motion starts with one render and a null loop; switching it off starts a loop from the current runtime clock.
6. Hidden state stops the loop; elapsed hidden time is excluded on resume.
7. A first-frame throw removes listeners and disposes objects/renderer before rethrowing.
8. `webglcontextlost` calls `preventDefault`, stops the loop, calls `onUnavailable`, and cleans up once.
9. Two calls to runtime `dispose()` dispose the renderer and objects once.

- [ ] **Step 2: Run runtime tests and confirm the runtime is missing**

```bash
pnpm exec vitest run src/components/background/shape-3d/global/test/global-background3d-runtime.test.ts
```

Expected: FAIL because `createGlobalBackground3DRuntime` does not exist.

- [ ] **Step 3: Implement renderer, scene, timing, listeners, and cleanup**

Use this public option boundary:

```ts
export interface GlobalBackground3DRuntimeOptions {
  createObjects?: () => GlobalBackgroundObject[];
  createRenderer?: (canvas: HTMLCanvasElement) => RendererAdapter;
  matchMedia?: (query: string) => MediaQueryList;
  now?: () => number;
  onReady?: () => void;
  onUnavailable?: () => void;
}
```

Default renderer:

```ts
new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
```

Set sRGB output, transparent clear, a `1400×800` orthographic camera, one `HemisphereLight`, and one `DirectionalLight`. Create all objects once, add their groups, and update every pose from the runtime's `now()` clock.

`resize()` must calculate cover frustum, select the responsive profile, cap DPR, set renderer size, and set all outline material resolutions.

Call sequence at successful startup must be: attach listeners → resize → apply initial/static pose → render → `onReady()` → synchronize animation loop. The `onReady()` callback must not run when render throws.

Use one idempotent cleanup function for normal unmount, partial creation failure, first-frame failure, and context loss. Context loss additionally calls `event.preventDefault()` and `onUnavailable()` before cleanup. Every listener flag must only be set after the corresponding `addEventListener` succeeds.

- [ ] **Step 4: Run runtime tests**

Run Step 2's command.

Expected: PASS in all timing, failure, and cleanup cases.

- [ ] **Step 5: Commit the runtime**

```bash
git add src/components/background/shape-3d/global/global-background3d-runtime.ts src/components/background/shape-3d/global/test/global-background3d-runtime.test.ts
git commit -m "feat(ui): run global 3d background scene"
```

### Task 5: Integrate fallback crossfade and global layering

**Files:**
- Create: `src/components/background/shape-3d/global/GlobalBackground3D.vue`
- Create: `src/components/background/shape-3d/global/test/GlobalBackground3D.test.ts`
- Modify: `src/App.vue`
- Modify: `src/assets/css/test/common-background.test.ts`

**Interfaces:**
- Consumes: `createGlobalBackground3DRuntime()`.
- Produces: a component emitting `ready-change` with a boolean, and an App root modifier class `app--global-background-ready`.

- [ ] **Step 1: Write failing component and layering tests**

Mock the runtime using hoisted `notifyReady`, `notifyUnavailable`, `dispose`, and `throwOnCreate` controls. Assert:

```ts
const wrapper = mount(GlobalBackground3D);
expect(wrapper.attributes('aria-hidden')).toBe('true');
expect(wrapper.get('canvas').classes()).not.toContain('is-ready');
mocks.notifyReady?.();
await nextTick();
expect(wrapper.get('canvas').classes()).toContain('is-ready');
expect(wrapper.emitted('ready-change')).toEqual([[true]]);
mocks.notifyUnavailable?.();
await nextTick();
expect(wrapper.emitted('ready-change')).toEqual([[true], [false]]);
```

Assert initialization failure emits/keeps false and unmount disposes an existing runtime exactly once.

Update the source contract test to require:

- `<GlobalBackground3D @ready-change="globalBackgroundReady = $event" />`.
- `.app::before` at `z-index: -4`, with opacity transition.
- `.app--global-background-ready::before { opacity: 0; }`.
- global Canvas wrapper at `z-index: -3` and `filter: var(--bg-filter)`.
- unchanged arrow `z-index: -2` and paper layer `z-index: -1`.
- `--bg` still references exactly `src/assets/img/bg.svg`.

- [ ] **Step 2: Run component and background contract tests**

```bash
pnpm exec vitest run src/components/background/shape-3d/global/test/GlobalBackground3D.test.ts src/assets/css/test/common-background.test.ts src/assets/img/test/bg-svg-contract.test.ts
```

Expected: FAIL because the component and new App contract are absent.

- [ ] **Step 3: Implement the Vue component**

Use `shallowRef(false)`, `useTemplateRef<HTMLCanvasElement>()`, and an idempotent component lifecycle. Emit false on synchronous creation failure and `onUnavailable`; guard callbacks with an `unmounted` flag.

Template and CSS contract:

```vue
<template>
  <div class="global-background-3d" aria-hidden="true">
    <canvas ref="canvas" class="global-background-3d__canvas" :class="{ 'is-ready': isReady }" />
  </div>
</template>

<style scoped lang="scss">
.global-background-3d {
  position: fixed;
  z-index: -3;
  inset: 0;
  overflow: hidden;
  filter: var(--bg-filter);
  pointer-events: none;
  transition: filter 0.3s;
}
.global-background-3d__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s;
}
.global-background-3d__canvas.is-ready { opacity: 1; }
</style>
```

- [ ] **Step 4: Mount the component and connect SVG opacity**

In `App.vue`, import the component, add `const globalBackgroundReady = shallowRef(false)`, bind the root modifier class, and mount the new component beside the unchanged arrow component. Change only the pseudo-element background z-index/opacity transition needed for the new stack; do not edit the arrow files.

- [ ] **Step 5: Run component/background tests and commit**

Run Step 2's command.

Expected: PASS.

```bash
git add src/components/background/shape-3d/global/GlobalBackground3D.vue src/components/background/shape-3d/global/test/GlobalBackground3D.test.ts src/App.vue src/assets/css/test/common-background.test.ts
git commit -m "feat(ui): integrate global 3d background fallback"
```

### Task 6: Complete automated and browser verification

**Files:**
- Modify only if a newly added failing regression test identifies a defect in the global module or App integration.

**Interfaces:**
- Consumes: the completed feature.
- Produces: verified desktop/mobile/theme/reduced-motion behavior with no changes to the six arrow files.

- [ ] **Step 1: Run all focused background tests**

```bash
pnpm exec vitest run src/components/background/shape-3d/global src/components/background/shape-3d/triangle src/assets/img/test/bg-svg-contract.test.ts src/assets/css/test/common-background.test.ts
```

Expected: all focused tests PASS, including the six SHA-256 assertions.

- [ ] **Step 2: Run repository verification**

```bash
pnpm exec vitest run
pnpm run type-check
pnpm exec eslint src/App.vue src/assets/css/test/common-background.test.ts src/components/background/shape-3d/config src/components/background/shape-3d/global
pnpm run build-only
git diff --check
```

Expected: every command exits 0; build emits production assets without TypeScript, Sass, or Rollup errors.

- [ ] **Step 3: Start the app and verify the browser matrix**

Run `pnpm dev --host 127.0.0.1` and use browser emulation for:

- `1440×900` light and dark.
- `768×1024` and `767×1024` to inspect the responsive boundary.
- `390×844` light and dark.
- `1440×900` and `390×844` with reduced motion enabled.

At every viewport, verify the six roles remain at their edge anchors, large objects stay cropped and self-spin without translation, small objects remain quiet, no outline depth connectors appear, the Hero remains dominant, and the console has no errors.

- [ ] **Step 4: Verify fallback and cleanup in the browser**

Use browser devtools to block WebGL context creation or trigger `WEBGL_lose_context`. Confirm the original SVG becomes/remains visible, no blank frame appears, and the console does not show an uncaught exception. Reload and confirm a successful scene crossfades without a double-saturation flash.

- [ ] **Step 5: Verify protected bytes and final repository state**

```bash
find src/components/background/shape-3d/triangle -type f -print0 | sort -z | xargs -0 shasum -a 256
git status --short
git log --oneline -8
```

Expected: hashes match Task 1, the working tree is clean, and the task commits are visible.

- [ ] **Step 6: Commit any test-backed QA correction, otherwise record no extra commit**

If browser QA required a correction, first add a regression assertion to the relevant global test, run it red, apply the smallest global-module/App fix, rerun all commands from Steps 1–2, and commit only those files:

```bash
git add src/App.vue src/assets/css/test/common-background.test.ts src/components/background/shape-3d/config src/components/background/shape-3d/global
git commit -m "fix(ui): refine global 3d background behavior"
```

If no correction was required, do not create an empty commit.
