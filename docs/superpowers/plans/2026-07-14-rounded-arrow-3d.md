# Rounded 3D Arrow Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current convex 3D triangle silhouette with a rounded, concave navigation arrow that initially points up-right, uses a lighter outline, and exposes shared body and outline color constants.

**Architecture:** Keep the existing Three.js scene, orbit calculation, runtime lifecycle, and Vue component boundary. Define one canonical path-command array in `triangle3d.ts`; build both the Three.js `Shape` and the SVG fallback path from it, and export two color constants used by both renderers.

**Tech Stack:** Vue 3, TypeScript, Three.js, Vitest, Vue Test Utils, pnpm, Vite

## Global Constraints

- Preserve `TRIANGLE_WORLD_POSITION`, `ORBIT_CENTER`, `ORBIT_OFFSET`, `ORBIT_DURATION_MS`, and the position calculation in `calculateContinuousPose()` exactly.
- Preserve `TRIANGLE_TOTAL_DEPTH = 24`, the existing three-axis spin ranges, the 30 FPS runtime, reduced-motion behavior, visibility pause behavior, and resource disposal.
- Keep extrusion bevel disabled; rounded corners come from the 2D path only.
- Export only the requested developer color controls: `TRIANGLE_BODY_COLOR` and `TRIANGLE_OUTLINE_COLOR`.
- Use `TRIANGLE_BODY_COLOR = '#f8cbc6'` and `TRIANGLE_OUTLINE_COLOR = '#f7aaa3'`.
- Use outline width `1` and outline opacity `0.42` in WebGL; use opacity `0.42` in the SVG fallback.
- Do not modify `App.vue`, `bg.svg`, or `triangle3d-runtime.ts` unless a failing regression test proves a synchronization defect.

---

## File Map

- Modify `src/components/background/triangle-3d/triangle3d.ts`: own the canonical arrow path, shared colors, Three.js shape construction, lighter outline, and near-front initial pose.
- Modify `src/components/background/triangle-3d/test/triangle3d.test.ts`: lock down concavity, rounded curves, material colors, light outline, dimensions, pose, and orbit invariants.
- Modify `src/components/background/triangle-3d/BackgroundTriangle3D.vue`: bind the canonical path and shared colors into the SVG fallback.
- Modify `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts`: verify fallback path, color, opacity, and lifecycle behavior.

### Task 1: Canonical Rounded Arrow Geometry and Palette

**Files:**
- Modify: `src/components/background/triangle-3d/triangle3d.ts`
- Test: `src/components/background/triangle-3d/test/triangle3d.test.ts`

**Interfaces:**
- Produces: `TRIANGLE_BODY_COLOR: '#f8cbc6'`
- Produces: `TRIANGLE_OUTLINE_COLOR: '#f7aaa3'`
- Produces: `TRIANGLE_FALLBACK_PATH: string`
- Produces: `createTriangleShape(): Shape`
- Preserves: `createTriangleObject(): TriangleObject` and all motion/framing exports.

- [ ] **Step 1: Replace the old silhouette assertions with failing arrow contracts**

Update the Three.js imports and module imports in `triangle3d.test.ts`:

```ts
import { Box3, Color, MathUtils, Mesh, Vector3 } from 'three';
import {
  ORBIT_DURATION_MS,
  STATIC_ROTATION,
  TRIANGLE_BODY_COLOR,
  TRIANGLE_FALLBACK_PATH,
  TRIANGLE_OUTLINE_COLOR,
  TRIANGLE_TOTAL_DEPTH,
  TRIANGLE_WORLD_POSITION,
  calculateContinuousPose,
  calculateCoverFrustum,
  createMotionProfile,
  createTriangleObject,
  createTriangleShape,
} from '../triangle3d';
```

Replace the first test and add the silhouette test:

```ts
it('builds a near-front rounded navigation arrow as a visible shallow prism', () => {
  const object = createTriangleObject();
  const bounds = new Box3().setFromObject(object.group);
  const size = bounds.getSize(new Vector3());

  expect(size.x).toBeGreaterThanOrEqual(110);
  expect(size.y).toBeGreaterThanOrEqual(96);
  expect(size.z).toBeCloseTo(TRIANGLE_TOTAL_DEPTH, 4);
  expect(TRIANGLE_TOTAL_DEPTH).toBe(24);
  expect(MathUtils.radToDeg(STATIC_ROTATION.x)).toBeCloseTo(8, 6);
  expect(MathUtils.radToDeg(STATIC_ROTATION.y)).toBeCloseTo(-12, 6);
  expect(MathUtils.radToDeg(STATIC_ROTATION.z)).toBeCloseTo(0, 6);
  expect(TRIANGLE_WORLD_POSITION).toEqual({ x: -482.5, y: -130, z: 0 });

  object.dispose();
});

it('uses one curved, concave up-right arrow contour', () => {
  const points = createTriangleShape().getPoints(32);
  const turnSigns = points
    .map((point, index) => {
      const previous = points[(index - 1 + points.length) % points.length]!;
      const next = points[(index + 1) % points.length]!;
      const cross = (point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x);
      return Math.abs(cross) > 0.01 ? Math.sign(cross) : 0;
    })
    .filter((sign) => sign !== 0);

  expect(TRIANGLE_FALLBACK_PATH.match(/C/g)?.length).toBeGreaterThanOrEqual(5);
  expect(new Set(turnSigns)).toEqual(new Set([-1, 1]));
  expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(40);
  expect(Math.max(...points.map((point) => point.y))).toBeGreaterThan(40);
});
```

Strengthen the outline/material assertions inside `outlines both prism caps without protruding depth connectors`:

```ts
expect(object.outlineMaterial.linewidth).toBe(1);
expect(object.outlineMaterial.opacity).toBe(0.42);
expect(object.outlineMaterial.color.getHexString()).toBe(new Color(TRIANGLE_OUTLINE_COLOR).getHexString());

const mesh = object.group.children.find((child) => child instanceof Mesh);
const materials = Array.isArray(mesh?.material) ? mesh.material : [];
expect(materials[0]?.color.getHexString()).toBe(new Color(TRIANGLE_BODY_COLOR).getHexString());
expect(materials[1]?.color.getHexString()).toBe(new Color(TRIANGLE_BODY_COLOR).getHexString());
expect(materials[0]?.opacity).toBeLessThanOrEqual(0.32);
expect(materials[1]?.opacity).toBeGreaterThanOrEqual(0.24);
expect(materials[1]?.opacity).toBeLessThanOrEqual(0.3);
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d.test.ts
```

Expected: FAIL because the shared color/path exports and `createTriangleShape` are not exported, and because the current rotation, outline, and side color do not meet the new contracts.

- [ ] **Step 3: Add the canonical path and shared color constants**

In `triangle3d.ts`, add these public values and internal path types near the existing constants:

```ts
export const TRIANGLE_BODY_COLOR = '#f8cbc6';
export const TRIANGLE_OUTLINE_COLOR = '#f7aaa3';

type PathPoint = readonly [x: number, y: number];
type TrianglePathCommand =
  | { type: 'M' | 'L'; point: PathPoint }
  | { type: 'C'; control1: PathPoint; control2: PathPoint; point: PathPoint }
  | { type: 'Z' };

const TRIANGLE_ARROW_PATH: readonly TrianglePathCommand[] = [
  { type: 'M', point: [258, 483] },
  { type: 'C', control1: [268, 479], control2: [278, 483], point: [274, 493] },
  { type: 'L', point: [241, 571] },
  { type: 'C', control1: [237, 581], control2: [234, 584], point: [229, 583] },
  { type: 'C', control1: [224, 583], control2: [221, 580], point: [218, 575] },
  { type: 'L', point: [204, 552] },
  { type: 'C', control1: [202, 549], control2: [200, 548], point: [196, 547] },
  { type: 'L', point: [169, 538] },
  { type: 'C', control1: [160, 535], control2: [156, 530], point: [157, 524] },
  { type: 'C', control1: [158, 518], control2: [162, 515], point: [169, 513] },
  { type: 'L', point: [258, 483] },
  { type: 'Z' },
];

function pointText([x, y]: PathPoint) {
  return `${x} ${y}`;
}

export const TRIANGLE_FALLBACK_PATH = TRIANGLE_ARROW_PATH.map((command) => {
  if (command.type === 'Z') return 'Z';
  if (command.type === 'C') {
    return `C ${pointText(command.control1)} ${pointText(command.control2)} ${pointText(command.point)}`;
  }
  return `${command.type} ${pointText(command.point)}`;
}).join(' ');
```

Replace `createTriangleShape()` with an exported command interpreter:

```ts
function localPathPoint([x, y]: PathPoint): [number, number] {
  return localPoint(x, y);
}

export function createTriangleShape() {
  const shape = new Shape();

  for (const command of TRIANGLE_ARROW_PATH) {
    if (command.type === 'Z') {
      shape.closePath();
      continue;
    }

    const point = localPathPoint(command.point);
    if (command.type === 'M') shape.moveTo(...point);
    else if (command.type === 'L') shape.lineTo(...point);
    else shape.bezierCurveTo(...localPathPoint(command.control1), ...localPathPoint(command.control2), ...point);
  }

  return shape;
}
```

- [ ] **Step 4: Apply the near-front pose and lighter shared palette**

Change `STATIC_ROTATION`:

```ts
export const STATIC_ROTATION = {
  x: MathUtils.degToRad(8),
  y: MathUtils.degToRad(-12),
  z: 0,
} as const;
```

Use `TRIANGLE_BODY_COLOR` for both materials, and update the outline:

```ts
const capMaterial = new MeshStandardMaterial({
  color: TRIANGLE_BODY_COLOR,
  metalness: 0,
  opacity: 0.28,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
  roughness: 0.95,
  transparent: true,
});
const sideMaterial = new MeshStandardMaterial({
  color: TRIANGLE_BODY_COLOR,
  metalness: 0,
  opacity: 0.26,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
  roughness: 0.95,
  transparent: true,
});
const outlineMaterial = new LineMaterial({
  color: TRIANGLE_OUTLINE_COLOR,
  linewidth: 1,
  opacity: 0.42,
  transparent: true,
  worldUnits: false,
});
```

- [ ] **Step 5: Run geometry and runtime regression tests**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d.test.ts src/components/background/triangle-3d/test/triangle3d-runtime.test.ts
```

Expected: both test files PASS, including the unchanged orbit start, 25-second position, full-cycle closure, reduced-motion behavior, visibility handling, and cleanup contracts.

- [ ] **Step 6: Commit the geometry task**

```bash
git add src/components/background/triangle-3d/triangle3d.ts src/components/background/triangle-3d/test/triangle3d.test.ts
git commit -m "feat(ui): reshape background triangle as rounded arrow"
```

### Task 2: Synchronized SVG Fallback

**Files:**
- Modify: `src/components/background/triangle-3d/BackgroundTriangle3D.vue`
- Test: `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts`

**Interfaces:**
- Consumes: `TRIANGLE_BODY_COLOR`, `TRIANGLE_OUTLINE_COLOR`, and `TRIANGLE_FALLBACK_PATH` from `triangle3d.ts`.
- Preserves: `createTriangle3DRuntime()` initialization, readiness callback, fallback-on-error behavior, and disposal.

- [ ] **Step 1: Write failing fallback synchronization assertions**

Add this import to `BackgroundTriangle3D.test.ts`:

```ts
import { TRIANGLE_BODY_COLOR, TRIANGLE_FALLBACK_PATH, TRIANGLE_OUTLINE_COLOR } from '../triangle3d';
```

Replace the fallback path assertions in the first component test:

```ts
expect(fallbackPath.attributes('d')).toBe(TRIANGLE_FALLBACK_PATH);
expect(fallbackPath.attributes('fill')).toBe(TRIANGLE_BODY_COLOR);
expect(fallbackPath.attributes('fill-opacity')).toBe('0.28');
expect(fallbackPath.attributes('stroke')).toBe(TRIANGLE_OUTLINE_COLOR);
expect(fallbackPath.attributes('stroke-opacity')).toBe('0.42');
```

- [ ] **Step 2: Run the component test and confirm the red state**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts
```

Expected: FAIL because the Vue fallback still contains the old hard-coded triangle path, outline color, and `0.6` stroke opacity.

- [ ] **Step 3: Bind the Vue fallback to the shared exports**

Add the shared import to `BackgroundTriangle3D.vue`:

```ts
import { TRIANGLE_BODY_COLOR, TRIANGLE_FALLBACK_PATH, TRIANGLE_OUTLINE_COLOR } from './triangle3d';
```

Replace the fallback `<path>` with:

```vue
<path
  :d="TRIANGLE_FALLBACK_PATH"
  :fill="TRIANGLE_BODY_COLOR"
  fill-opacity="0.28"
  :stroke="TRIANGLE_OUTLINE_COLOR"
  stroke-opacity="0.42"
/>
```

- [ ] **Step 4: Run all triangle component tests**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test
```

Expected: all triangle geometry, runtime, and Vue component tests PASS.

- [ ] **Step 5: Commit the synchronized fallback**

```bash
git add src/components/background/triangle-3d/BackgroundTriangle3D.vue src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts
git commit -m "fix(ui): synchronize rounded arrow fallback"
```

### Task 3: Visual and Full Regression Verification

**Files:**
- Verify: `src/components/background/triangle-3d/triangle3d.ts`
- Verify: `src/components/background/triangle-3d/BackgroundTriangle3D.vue`
- Verify: `src/components/background/triangle-3d/test/triangle3d.test.ts`
- Verify: `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts`

**Interfaces:**
- Consumes the complete arrow implementation from Tasks 1 and 2.
- Produces verified shallow/dark-theme screenshots and a clean regression result; no new public API.

- [ ] **Step 1: Start or reuse the Vite development server**

Run `pnpm dev --host 0.0.0.0 --port 8080` when no current workspace server is available. Expected: Vite reports a local or network URL without compilation errors.

- [ ] **Step 2: Inspect the initial pose and motion in the real page**

Refresh the page and inspect the first two seconds in the light theme. Verify that the arrow points up-right, the concave waist is obvious, the front face dominates, a small amount of side thickness remains visible, the outline is lighter than the checkpoint version, and motion follows the same orbit.

Switch to the dark theme and repeat. Verify that the existing `var(--bg-filter)` continues to harmonize the arrow with the other background shapes and that the outline remains visible without dominating.

- [ ] **Step 3: Make only evidence-driven visual tuning if required**

If the real page fails a listed acceptance criterion, add or tighten the relevant focused assertion first, reproduce the red state, and then change only one of the arrow path coordinates, `STATIC_ROTATION`, outline width, or outline opacity. Do not alter any orbit or spin constant.

- [ ] **Step 4: Run complete automated verification**

Run:

```bash
pnpm exec vitest run
pnpm type-check
pnpm exec eslint src/components/background/triangle-3d/triangle3d.ts src/components/background/triangle-3d/BackgroundTriangle3D.vue src/components/background/triangle-3d/test/triangle3d.test.ts src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts
pnpm build
git diff --check
```

Expected: all tests pass, type-check and ESLint exit successfully, production build succeeds with at most the pre-existing chunk-size warning, and `git diff --check` produces no output.

- [ ] **Step 5: Confirm orbit source remains unchanged**

Run:

```bash
git diff 9c7592b -- src/components/background/triangle-3d/triangle3d.ts
```

Expected: the diff changes path/palette/rotation code only; `ORBIT_CENTER`, `ORBIT_OFFSET`, `ORBIT_DURATION_MS`, and the `position` object in `calculateContinuousPose()` have no changed lines.
