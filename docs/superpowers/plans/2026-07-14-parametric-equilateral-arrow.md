# Parametric Equilateral 3D Arrow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-authored arrow coordinates with a developer-adjustable shape configuration whose default outer guide is equilateral, while preserving the current 3D material, motion, orbit, and shared SVG fallback.

**Architecture:** `triangle3d.ts` will derive a canonical triangle guide from five semantic parameters, rotate it to the existing up-right direction, insert a concave notch, and round the resulting polygon. The generated path commands remain the single source for both the Three.js `Shape` and `TRIANGLE_FALLBACK_PATH`.

**Tech Stack:** TypeScript, Three.js, Vue 3, Vitest, pnpm, Vite

## Global Constraints

- Export `TRIANGLE_SHAPE_CONFIG` with defaults `sideLength: 112`, `heightScale: 1`, `tipSkew: 0`, `notchDepth: 22`, and `cornerRadius: 10`.
- At `heightScale = 1` and `tipSkew = 0`, the three outer guide vertices must be equidistant within floating-point tolerance.
- Keep the arrow's internal direction rotation at `58°`, pointing up-right.
- Preserve `STATIC_ROTATION`, `TRIANGLE_TOTAL_DEPTH`, colors, opacities, outline width, outline opacity, material settings, and all spin ranges.
- Preserve `TRIANGLE_WORLD_POSITION`, `ORBIT_CENTER`, `ORBIT_OFFSET`, `ORBIT_DURATION_MS`, and the position calculation in `calculateContinuousPose()` exactly.
- Do not modify `BackgroundTriangle3D.vue`, `triangle3d-runtime.ts`, `App.vue`, or `bg.svg` unless a failing regression test proves the shared-path assumption is false.

---

## File Map

- Modify `src/components/background/triangle-3d/triangle3d.ts`: define the public shape config, calculate the equilateral guide, generate safe rounded commands, and feed both renderers.
- Modify `src/components/background/triangle-3d/test/triangle3d.test.ts`: verify default parameters, equilateral geometry, individual parameter effects, concavity, round-corner safety, and unchanged orbit/material contracts.
- Verify `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts`: ensure the Vue fallback still consumes the generated path without template changes.

### Task 1: Parameter and Equilateral Guide Contracts

**Files:**
- Modify: `src/components/background/triangle-3d/test/triangle3d.test.ts`
- Modify: `src/components/background/triangle-3d/triangle3d.ts`

**Interfaces:**
- Produces: `TriangleShapeConfig`
- Produces: `TRIANGLE_SHAPE_CONFIG`
- Produces: `TriangleGuide`
- Produces: `calculateTriangleGuide(config?: TriangleShapeConfig): TriangleGuide`

- [ ] **Step 1: Add failing default and equilateral guide tests**

Import `TRIANGLE_SHAPE_CONFIG` and `calculateTriangleGuide` in `triangle3d.test.ts`. Add these helpers and tests:

```ts
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function triangleArea(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
}

it('exposes developer-friendly defaults for an equilateral arrow guide', () => {
  expect(TRIANGLE_SHAPE_CONFIG).toEqual({
    sideLength: 112,
    heightScale: 1,
    tipSkew: 0,
    notchDepth: 22,
    cornerRadius: 10,
  });

  const guide = calculateTriangleGuide();
  const sides = [
    distance(guide.tip, guide.bottomRight),
    distance(guide.bottomRight, guide.bottomLeft),
    distance(guide.bottomLeft, guide.tip),
  ];

  sides.forEach((side) => expect(side).toBeCloseTo(TRIANGLE_SHAPE_CONFIG.sideLength, 6));
});

it('lets height and skew tune the triangle without editing path coordinates', () => {
  const defaultGuide = calculateTriangleGuide();
  const flatterGuide = calculateTriangleGuide({ ...TRIANGLE_SHAPE_CONFIG, heightScale: 0.8 });
  const skewedGuide = calculateTriangleGuide({ ...TRIANGLE_SHAPE_CONFIG, tipSkew: 12 });

  expect(distance(flatterGuide.bottomRight, flatterGuide.bottomLeft)).toBeCloseTo(TRIANGLE_SHAPE_CONFIG.sideLength, 6);
  expect(triangleArea(flatterGuide.tip, flatterGuide.bottomRight, flatterGuide.bottomLeft)).toBeLessThan(
    triangleArea(defaultGuide.tip, defaultGuide.bottomRight, defaultGuide.bottomLeft),
  );
  expect(distance(skewedGuide.tip, skewedGuide.bottomRight)).not.toBeCloseTo(distance(skewedGuide.tip, skewedGuide.bottomLeft), 4);
});

it('moves the concave notch toward the tip by the configured depth', () => {
  const guide = calculateTriangleGuide();
  const baseMidpoint = {
    x: (guide.bottomRight.x + guide.bottomLeft.x) / 2,
    y: (guide.bottomRight.y + guide.bottomLeft.y) / 2,
  };

  expect(distance(baseMidpoint, guide.notch)).toBeCloseTo(TRIANGLE_SHAPE_CONFIG.notchDepth, 6);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test/triangle3d.test.ts
```

Expected: FAIL because `TRIANGLE_SHAPE_CONFIG` and `calculateTriangleGuide` do not exist.

- [ ] **Step 3: Add the public configuration and guide calculation**

Add these declarations near the current color/depth constants in `triangle3d.ts`:

```ts
export interface TriangleShapeConfig {
  sideLength: number;
  heightScale: number;
  tipSkew: number;
  notchDepth: number;
  cornerRadius: number;
}

export interface TrianglePoint {
  x: number;
  y: number;
}

export interface TriangleGuide {
  tip: TrianglePoint;
  bottomRight: TrianglePoint;
  notch: TrianglePoint;
  bottomLeft: TrianglePoint;
}

export const TRIANGLE_SHAPE_CONFIG = {
  sideLength: 112,
  heightScale: 1,
  tipSkew: 0,
  notchDepth: 22,
  cornerRadius: 10,
} as const satisfies TriangleShapeConfig;
```

Use an internal `ARROW_DIRECTION_RADIANS = MathUtils.degToRad(58)` and implement:

```ts
function rotateAndTranslate(point: TrianglePoint): TrianglePoint {
  const cos = Math.cos(ARROW_DIRECTION_RADIANS);
  const sin = Math.sin(ARROW_DIRECTION_RADIANS);
  return {
    x: TRIANGLE_CENTER.x + point.x * cos - point.y * sin,
    y: TRIANGLE_CENTER.y + point.x * sin + point.y * cos,
  };
}

export function calculateTriangleGuide(config: TriangleShapeConfig = TRIANGLE_SHAPE_CONFIG): TriangleGuide {
  const height = (config.sideLength * Math.sqrt(3) * config.heightScale) / 2;
  const tip = { x: config.tipSkew, y: (-2 * height) / 3 };
  const bottomRight = { x: config.sideLength / 2, y: height / 3 };
  const bottomLeft = { x: -config.sideLength / 2, y: height / 3 };
  const baseMidpoint = { x: 0, y: height / 3 };
  const towardTip = { x: tip.x - baseMidpoint.x, y: tip.y - baseMidpoint.y };
  const towardTipLength = Math.hypot(towardTip.x, towardTip.y) || 1;
  const notch = {
    x: baseMidpoint.x + (towardTip.x / towardTipLength) * config.notchDepth,
    y: baseMidpoint.y + (towardTip.y / towardTipLength) * config.notchDepth,
  };

  return {
    tip: rotateAndTranslate(tip),
    bottomRight: rotateAndTranslate(bottomRight),
    notch: rotateAndTranslate(notch),
    bottomLeft: rotateAndTranslate(bottomLeft),
  };
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused test file again. Expected: the new guide tests pass while the existing hand-authored path tests remain unchanged.

### Task 2: Safe Rounded Path Generator

**Files:**
- Modify: `src/components/background/triangle-3d/test/triangle3d.test.ts`
- Modify: `src/components/background/triangle-3d/triangle3d.ts`

**Interfaces:**
- Consumes: `calculateTriangleGuide()` and `TriangleShapeConfig` from Task 1.
- Preserves: `TRIANGLE_FALLBACK_PATH`, `createTriangleShape()`, and `createTriangleObject()`.

- [ ] **Step 1: Replace the cubic-path contract with failing generated-path contracts**

Update the existing contour test:

```ts
it('uses one safely rounded, concave up-right contour', () => {
  const points = createTriangleShape().getPoints(32);
  const turnSigns = points
    .map((point, index) => {
      const previous = points[(index - 1 + points.length) % points.length]!;
      const next = points[(index + 1) % points.length]!;
      const cross = (point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x);
      return Math.abs(cross) > 0.01 ? Math.sign(cross) : 0;
    })
    .filter((sign) => sign !== 0);

  expect(TRIANGLE_FALLBACK_PATH.match(/Q/g)?.length).toBe(4);
  expect(new Set(turnSigns)).toEqual(new Set([-1, 1]));
  expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
});

it('caps oversized corner radii before they can fold the path', () => {
  const shape = createTriangleShape({ ...TRIANGLE_SHAPE_CONFIG, cornerRadius: 1_000 });
  const points = shape.getPoints(32);

  expect(points.length).toBeGreaterThan(20);
  expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Expected: FAIL because the current fallback uses cubic commands and `createTriangleShape` does not accept configuration.

- [ ] **Step 3: Generate rounded polygon commands from the guide**

Replace tuple path points and hand-authored commands with:

```ts
type TrianglePathCommand =
  | { type: 'M' | 'L'; point: TrianglePoint }
  | { type: 'Q'; control: TrianglePoint; point: TrianglePoint }
  | { type: 'Z' };

function distanceBetween(a: TrianglePoint, b: TrianglePoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function moveToward(from: TrianglePoint, to: TrianglePoint, distance: number): TrianglePoint {
  const length = distanceBetween(from, to) || 1;
  const ratio = distance / length;
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
}

function createRoundedPathCommands(config: TriangleShapeConfig): TrianglePathCommand[] {
  const guide = calculateTriangleGuide(config);
  const polygon = [guide.tip, guide.bottomRight, guide.notch, guide.bottomLeft];
  const corners = polygon.map((point, index) => {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const safeRadius = Math.min(Math.max(0, config.cornerRadius), distanceBetween(point, previous) * 0.4, distanceBetween(point, next) * 0.4);
    return {
      control: point,
      entry: moveToward(point, previous, safeRadius),
      exit: moveToward(point, next, safeRadius),
    };
  });
  const commands: TrianglePathCommand[] = [{ type: 'M', point: corners[0]!.entry }];

  corners.forEach((corner, index) => {
    if (index > 0) commands.push({ type: 'L', point: corner.entry });
    commands.push({ type: 'Q', control: corner.control, point: corner.exit });
  });
  commands.push({ type: 'L', point: corners[0]!.entry }, { type: 'Z' });
  return commands;
}
```

Generate the shared SVG path with these helpers:

```ts
function formatCoordinate(value: number) {
  return Number(value.toFixed(4)).toString();
}

function pointText(point: TrianglePoint) {
  return `${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`;
}

function pathCommandsToSvg(commands: TrianglePathCommand[]) {
  return commands
    .map((command) => {
      if (command.type === 'Z') return 'Z';
      if (command.type === 'Q') return `Q ${pointText(command.control)} ${pointText(command.point)}`;
      return `${command.type} ${pointText(command.point)}`;
    })
    .join(' ');
}

export const TRIANGLE_FALLBACK_PATH = pathCommandsToSvg(createRoundedPathCommands(TRIANGLE_SHAPE_CONFIG));
```

Update the Three.js command interpreter and allow a caller to supply a variant configuration:

```ts
export function createTriangleShape(config: TriangleShapeConfig = TRIANGLE_SHAPE_CONFIG) {
  const shape = new Shape();

  for (const command of createRoundedPathCommands(config)) {
    if (command.type === 'Z') {
      shape.closePath();
      continue;
    }

    const [x, y] = localPoint(command.point.x, command.point.y);
    if (command.type === 'M') shape.moveTo(x, y);
    else if (command.type === 'L') shape.lineTo(x, y);
    else {
      const [controlX, controlY] = localPoint(command.control.x, command.control.y);
      shape.quadraticCurveTo(controlX, controlY, x, y);
    }
  }

  return shape;
}
```

- [ ] **Step 4: Run all triangle tests and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/background/triangle-3d/test
```

Expected: all geometry, runtime, and Vue fallback tests pass. Existing orbit, motion, visibility, reduced-motion, and disposal assertions remain green.

- [ ] **Step 5: Commit the parameterized generator**

```bash
git add src/components/background/triangle-3d/triangle3d.ts src/components/background/triangle-3d/test/triangle3d.test.ts
git commit -m "refactor(ui): parameterize equilateral arrow shape"
```

### Task 3: Real-Page Parameter Tuning and Regression Verification

**Files:**
- Modify only if visual evidence requires it: `src/components/background/triangle-3d/triangle3d.ts`
- Modify matching assertions if a default changes: `src/components/background/triangle-3d/test/triangle3d.test.ts`

**Interfaces:**
- Consumes: `TRIANGLE_SHAPE_CONFIG`.
- Produces: visually balanced defaults while leaving the generator and motion interfaces intact.

- [ ] **Step 1: Start an isolated Vite preview and capture the first frame**

Run `pnpm dev --host 127.0.0.1 --port 8081` in the feature worktree. Inspect the light-theme first frame and a crop around the arrow, then repeat in dark theme.

- [ ] **Step 2: Tune only semantic defaults when visual evidence requires it**

Begin with `112 / 1 / 0 / 22 / 10`. If the near-front projection still appears disproportionate, change one value at a time in this order:

1. `heightScale` in increments of `0.02` to correct overall height.
2. `notchDepth` in increments of `2` to balance the concavity.
3. `cornerRadius` in increments of `1` to equalize optical corner weight.

Keep `sideLength` and `tipSkew` at `112` and `0` unless the actual size or symmetry is demonstrably wrong. Do not compensate for a late, strongly tilted animation frame by changing the mathematically equilateral base.

- [ ] **Step 3: Verify motion and themes**

Refresh and inspect the initial two seconds in both themes. Confirm the arrow begins up-right with balanced outer sides, retains a clear notch, exposes slight thickness, and then follows the existing orbit without a position jump. Console output must contain no Vue, Three.js, or WebGL errors.

- [ ] **Step 4: Run complete verification**

Run:

```bash
pnpm exec vitest run
pnpm type-check
pnpm exec eslint src/components/background/triangle-3d/triangle3d.ts src/components/background/triangle-3d/test/triangle3d.test.ts
pnpm build
git diff --check
```

Expected: all tests pass, type-check and ESLint exit successfully, production build succeeds with at most the existing chunk-size warning, and `git diff --check` produces no output.

- [ ] **Step 5: Prove orbit-sensitive source is unchanged**

Run:

```bash
git diff 8bc3ad2 -- src/components/background/triangle-3d/triangle3d.ts
```

Expected: no changed lines for `TRIANGLE_WORLD_POSITION`, `ORBIT_CENTER`, `ORBIT_OFFSET`, `ORBIT_DURATION_MS`, spin ranges, or the `position` object in `calculateContinuousPose()`.
