# Home Role X Acrylic Material Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the home role suffix’s current scramble character as a translucent, gradient-edged acrylic object with optional pointer-follow orientation and a configurable static fallback.

**Architecture:** Keep `ScrambleFrameText` as the stable character-cell and pointer-state owner. Add a focused `ScrambleAcrylicGlyph` SVG renderer that receives the live character and depth vector, while `Home.vue` opts the visible title into pointer following and leaves the invisible sizing copy static.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, inline SVG, CSS 3D transforms, Vitest, Vue Test Utils.

## Global Constraints

- Preserve the exact existing Coder, Writer, Creator, and Builder RGBA colors and gradient stop offsets.
- Every transient scramble character at the target index must use the acrylic renderer; never hard-code `X`.
- Pointer following is opt-in and defaults to `false`.
- Pointer following must fall back to configured orientation for touch/coarse pointers and `prefers-reduced-motion: reduce`.
- Do not add dependencies, Canvas, WebGL, stores, or a second scramble timer.
- Preserve the title’s current cell width, baseline, responsive layout, and accessible outer label.
- All inner decorative SVG nodes remain `aria-hidden="true"`.

---

### Task 1: Acrylic SVG Glyph Renderer

**Files:**
- Create: `src/components/scramble/ScrambleAcrylicGlyph.vue`
- Create: `src/components/scramble/test/ScrambleAcrylicGlyph.test.ts`

**Interfaces:**
- Consumes:
  - `character: string`
  - `gradientStartOffset?: string` (default `"20%"`)
  - `depthX?: number` (default `5`)
  - `depthY?: number` (default `5`)
- Produces:
  - `.scramble-acrylic-glyph`
  - Four `.scramble-acrylic-depth` text layers
  - `.scramble-acrylic-face`
  - `.scramble-acrylic-highlight`
  - Unique edge, face, side, and highlight SVG gradient IDs per component instance

- [ ] **Step 1: Write the failing renderer tests**

Add tests that mount two instances and assert the live character is present in every visual layer, gradients are unique, and numeric SVG font sizes cannot be rewritten by `postcss-pxtorem`:

```ts
const wrapper = mount(
  defineComponent({
    components: { ScrambleAcrylicGlyph },
    template: `
      <div>
        <ScrambleAcrylicGlyph character="ケ" gradient-start-offset="30%" :depth-x="6" :depth-y="4" />
        <ScrambleAcrylicGlyph character="X" />
      </div>
    `,
  }),
);
const glyphs = wrapper.findAllComponents(ScrambleAcrylicGlyph);
const first = glyphs[0]!;
const firstIds = first.findAll('linearGradient').map((gradient) => gradient.attributes('id'));
const secondIds = glyphs[1]!.findAll('linearGradient').map((gradient) => gradient.attributes('id'));

expect(first.get('.scramble-acrylic-glyph').attributes('viewBox')).toBe('-8 -8 94 118');
expect(first.findAll('.scramble-acrylic-depth')).toHaveLength(4);
expect(first.findAll('text').every((layer) => layer.text() === 'ケ')).toBe(true);
expect(first.findAll('text').every((layer) => layer.attributes('font-size') === '100')).toBe(true);
expect(first.get('.scramble-acrylic-edge-gradient stop').attributes('offset')).toBe('30%');
expect(firstIds.every((id) => !secondIds.includes(id))).toBe(true);
expect(first.get('.scramble-acrylic-depth:last-of-type').attributes('x')).toBe('41');
expect(first.get('.scramble-acrylic-depth:last-of-type').attributes('y')).toBe('90');
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleAcrylicGlyph.test.ts
```

Expected: FAIL because `ScrambleAcrylicGlyph.vue` does not exist.

- [ ] **Step 3: Implement the SVG renderer**

Create a component that uses a fixed four-step depth array and `useId()`:

```ts
const props = withDefaults(
  defineProps<{
    character: string;
    gradientStartOffset?: string;
    depthX?: number;
    depthY?: number;
  }>(),
  {
    gradientStartOffset: '20%',
    depthX: 5,
    depthY: 5,
  },
);

const layerProgress = [0.25, 0.5, 0.75, 1] as const;
const id = useId();
const gradientIds = {
  edge: `scramble-acrylic-edge-${id}`,
  face: `scramble-acrylic-face-${id}`,
  side: `scramble-acrylic-side-${id}`,
  highlight: `scramble-acrylic-highlight-${id}`,
};
const layerPosition = (progress: number) => ({
  x: 35 + props.depthX * progress,
  y: 86 + props.depthY * progress,
});
```

Render the back-to-front order: four side layers, the translucent face, then a slightly offset white highlight. Use `font-size="100"` attributes, `paint-order: stroke fill`, the existing `--scramble-accent-gradient-start/end` variables, side opacity no higher than `0.18`, face opacity no higher than `0.16`, and a `1.5px` edge stroke.

- [ ] **Step 4: Run the renderer tests to verify GREEN**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleAcrylicGlyph.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the renderer**

```bash
git add src/components/scramble/ScrambleAcrylicGlyph.vue src/components/scramble/test/ScrambleAcrylicGlyph.test.ts
git commit -m "feat(home): add acrylic scramble glyph"
```

---

### Task 2: Optional Pointer-Follow Orientation

**Files:**
- Modify: `src/components/scramble/ScrambleFrameText.vue`
- Modify: `src/components/scramble/test/ScrambleFrameText.test.ts`

**Interfaces:**
- Consumes `ScrambleAcrylicGlyph` from Task 1.
- Produces these optional props:
  - `accentAcrylic?: boolean` default `false`
  - `accentFollowPointer?: boolean` default `false`
  - `accentDefaultTiltX?: number` default `-3`
  - `accentDefaultTiltY?: number` default `6`
  - `accentDepthX?: number` default `5`
  - `accentDepthY?: number` default `5`
  - `accentMaxPointerTilt?: number` default `7`

- [ ] **Step 1: Write failing acrylic integration tests**

Extend the component tests with:

```ts
it('applies acrylic material to the live target-index scramble character', () => {
  const wrapper = mount(ScrambleFrameText, {
    props: {
      frame: 'Writerケ',
      target: 'WriterX',
      accentAcrylic: true,
      accentDepthX: 6,
      accentDepthY: 4,
    },
  });

  expect(wrapper.get('.scramble-accent-character').classes()).toContain('scramble-accent-acrylic');
  expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
    character: 'ケ',
    depthX: 6,
    depthY: 4,
  });
});
```

Add a pointer test that mocks `matchMedia`, `requestAnimationFrame`, and the root bounding box:

```ts
vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
  matches: query === '(pointer: fine)',
} as MediaQueryList));
vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
  callback(0);
  return 1;
});
const wrapper = mount(ScrambleFrameText, {
  props: {
    frame: 'WriterX',
    target: 'WriterX',
    accentAcrylic: true,
    accentFollowPointer: true,
    accentDefaultTiltX: -3,
    accentDefaultTiltY: 6,
    accentMaxPointerTilt: 7,
  },
});
vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
  left: 0,
  top: 0,
  width: 200,
  height: 100,
  right: 200,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

await wrapper.trigger('pointermove', { clientX: 200, clientY: 0 });
expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 13deg');
await wrapper.trigger('pointerleave');
expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 6deg');
```

Also assert that `accentFollowPointer: false`, coarse pointer, and reduced motion do not leave default orientation.

- [ ] **Step 2: Run the component test to verify RED**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleFrameText.test.ts
```

Expected: FAIL because the acrylic props, nested component, classes, and handlers do not exist.

- [ ] **Step 3: Implement orientation state and event coalescing**

Add refs for tilt and depth initialized from props, a computed CSS-variable style, and capability guards:

```ts
const tiltX = ref(props.accentDefaultTiltX);
const tiltY = ref(props.accentDefaultTiltY);
const depthX = ref(props.accentDepthX);
const depthY = ref(props.accentDepthY);
let pointerFrameId: number | null = null;

const canFollowPointer = () =>
  props.accentAcrylic &&
  props.accentFollowPointer &&
  window.matchMedia?.('(pointer: fine)').matches &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const acrylicStyle = computed(() => ({
  '--scramble-acrylic-tilt-x': `${tiltX.value}deg`,
  '--scramble-acrylic-tilt-y': `${tiltY.value}deg`,
}));
```

Normalize pointer coordinates to `[-1, 1]`, set `tiltX = defaultTiltX - normalizedY * maxTilt`, set `tiltY = defaultTiltY + normalizedX * maxTilt`, and apply at most once per animation frame. Change the depth vector by no more than `1.5` SVG units opposite the pointer direction. Reset on pointer leave and cancel the frame in `onBeforeUnmount`.

Render `ScrambleAcrylicGlyph` before the existing outline branch. Apply `perspective(420px) rotateX(...) rotateY(...)` only to `.scramble-accent-acrylic .scramble-acrylic-glyph`; preserve the existing outline branch unchanged for backward compatibility.

- [ ] **Step 4: Run component and renderer tests to verify GREEN**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleFrameText.test.ts src/components/scramble/test/ScrambleAcrylicGlyph.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit pointer orientation**

```bash
git add src/components/scramble/ScrambleFrameText.vue src/components/scramble/test/ScrambleFrameText.test.ts
git commit -m "feat(home): add optional acrylic pointer tilt"
```

---

### Task 3: Home Integration and Regression Coverage

**Files:**
- Modify: `src/views/home/Home.vue`
- Modify: `src/views/home/test/Home.scramble.test.ts`

**Interfaces:**
- Consumes the acrylic props from Task 2.
- Produces:
  - Visible title: acrylic enabled, pointer follow enabled.
  - Hidden sizer: acrylic enabled, pointer follow disabled.
  - Home defaults: tilt X `-3`, tilt Y `6`, depth X `5`, depth Y `5`, max pointer tilt `7`.

- [ ] **Step 1: Write failing Home configuration tests**

Replace the existing outline-only assertion with exact acrylic configuration:

```ts
const [sizer, visible] = wrapper.findAllComponents(ScrambleFrameText);
expect(sizer?.props()).toMatchObject({
  accentAcrylic: true,
  accentFollowPointer: false,
  accentDefaultTiltX: -3,
  accentDefaultTiltY: 6,
  accentDepthX: 5,
  accentDepthY: 5,
  accentMaxPointerTilt: 7,
});
expect(visible?.props()).toMatchObject({
  accentAcrylic: true,
  accentFollowPointer: true,
  accentDefaultTiltX: -3,
  accentDefaultTiltY: 6,
  accentDepthX: 5,
  accentDepthY: 5,
  accentMaxPointerTilt: 7,
});
```

Assert that the legacy gradient-text fallback excludes both `.scramble-accent-outline` and `.scramble-accent-acrylic`.

- [ ] **Step 2: Run the Home test to verify RED**

Run:

```bash
pnpm vitest run src/views/home/test/Home.scramble.test.ts
```

Expected: FAIL because Home still enables `accent-outline` and does not pass pointer/default-orientation props.

- [ ] **Step 3: Integrate the acrylic material**

Configure both title instances with:

```vue
accent-acrylic
:accent-default-tilt-x="-3"
:accent-default-tilt-y="6"
:accent-depth-x="5"
:accent-depth-y="5"
:accent-max-pointer-tilt="7"
```

Add `accent-follow-pointer` only to the visible title. Keep the existing Coder `30%` and other-role `20%` start-offset expressions. Update the fallback selector to:

```scss
.title-word :deep(.scramble-last-character),
.title-word :deep(.scramble-accent-character:not(.scramble-accent-outline):not(.scramble-accent-acrylic)) {
  background-image: var(--active-x-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

- [ ] **Step 4: Run focused and related regression tests**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleAcrylicGlyph.test.ts src/components/scramble/test/ScrambleFrameText.test.ts src/views/home/test/Home.scramble.test.ts
```

Expected: PASS.

Then run:

```bash
pnpm vitest run src/components/scramble src/views/home
```

Expected: PASS.

- [ ] **Step 5: Commit Home integration**

```bash
git add src/views/home/Home.vue src/views/home/test/Home.scramble.test.ts
git commit -m "feat(home): render role suffix as acrylic object"
```

---

### Task 4: Full Verification and Browser Acceptance

**Files:**
- Verify only; modify earlier files only if a concrete failing check identifies a defect.

**Interfaces:**
- Consumes the integrated feature from Tasks 1–3.
- Produces verified desktop, mobile, reduced-motion, and default-orientation behavior.

- [ ] **Step 1: Run the complete automated gate**

Run:

```bash
pnpm vitest run
pnpm type-check
pnpm exec eslint src/components/scramble/ScrambleAcrylicGlyph.vue src/components/scramble/ScrambleFrameText.vue src/components/scramble/test/ScrambleAcrylicGlyph.test.ts src/components/scramble/test/ScrambleFrameText.test.ts src/views/home/Home.vue src/views/home/test/Home.scramble.test.ts
pnpm build
```

Expected:

- All Vitest files and tests pass.
- `vue-tsc --noEmit` exits `0`.
- Targeted ESLint exits `0`.
- Vite production build exits `0`; the existing chunk-size advisory may remain.

- [ ] **Step 2: Verify desktop pointer behavior in the browser**

At `1570 × 900`, confirm:

- The stable X and at least one transient scramble glyph share the acrylic layers.
- Face fill is translucent and the role gradient remains exact.
- Pointer movement at all four word corners changes tilt continuously.
- Tilt remains readable and pointer leave restores `-3deg / 6deg`.
- No horizontal overflow or clipping occurs.

- [ ] **Step 3: Verify mobile and reduced motion**

At `390 × 844`, confirm the static default orientation, no horizontal overflow, and no pointer-driven state change. Emulate reduced motion at desktop width and confirm the same static fallback.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff HEAD~3..HEAD --stat
```

Expected: no whitespace errors, no unrelated files, and only the planned component/test/Home files plus the approved docs commits.
