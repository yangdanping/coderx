# Home Role X Static Acrylic Material Implementation Plan

> **Revision:** Pointer-follow behavior was removed after visual review. The final component exposes only static orientation and depth.

**Goal:** Render the home role suffix’s live scramble character as a translucent, gradient-edged acrylic object with a configurable fixed 3D orientation.

**Architecture:** Keep `ScrambleFrameText` as the stable character-cell owner. `ScrambleAcrylicGlyph` remains a focused SVG renderer that receives the live character and depth vector. `Home.vue` supplies the same static orientation to the visible title and hidden sizing copy.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, inline SVG, static CSS 3D transforms, Vitest, Vue Test Utils.

## Constraints

- Preserve the existing Coder, Writer, Creator, and Builder RGBA colors and gradient stop offsets.
- Render every transient target-index character through the acrylic renderer; never hard-code `X`.
- Preserve the `0 0 70 100` glyph coordinate system, title cell width, baseline, responsive layout, and accessible outer label.
- Do not register pointer/touch/device-orientation events.
- Do not use `requestAnimationFrame`, media-query capability tracking, or mutable orientation state.
- Do not add dependencies, Canvas, WebGL, stores, or another scramble timer.

## Task 1: Lock the Static Component Contract

**Files:**

- Modify: `src/components/scramble/test/ScrambleFrameText.test.ts`
- Modify: `src/views/home/test/Home.scramble.test.ts`

1. Replace pointer-follow tests with assertions for:
   - `accentTiltX` and `accentTiltY`.
   - `accentDepthX` and `accentDepthY`.
   - Live transient-character rendering.
   - Absence of pointer, media-query, and animation-frame runtime code.
2. Update the Home test so both title instances use the same static configuration.
3. Run the focused tests and confirm they fail against the pointer-follow implementation.

## Task 2: Simplify `ScrambleFrameText`

**File:** `src/components/scramble/ScrambleFrameText.vue`

1. Remove:
   - `accentFollowPointer`.
   - `accentMaxPointerTilt`.
   - pointer event handlers.
   - rAF scheduling and cancellation.
   - media-query listeners.
   - tilt/depth refs, watchers, and lifecycle cleanup.
2. Rename the fixed orientation props:
   - `accentDefaultTiltX` → `accentTiltX`.
   - `accentDefaultTiltY` → `accentTiltY`.
3. Derive CSS variables directly from props:

```ts
const acrylicStyle = computed(() => ({
  '--scramble-acrylic-tilt-x': `${props.accentTiltX}deg`,
  '--scramble-acrylic-tilt-y': `${props.accentTiltY}deg`,
}));
```

4. Pass `accentDepthX` and `accentDepthY` directly to `ScrambleAcrylicGlyph`.
5. Remove transform transitions, `will-change`, and the acrylic reduced-motion override because the transform no longer changes interactively.

## Task 3: Update Home Integration

**File:** `src/views/home/Home.vue`

Configure both title instances with:

```vue
accent-acrylic
:accent-tilt-x="-3"
:accent-tilt-y="6"
:accent-depth-x="5"
:accent-depth-y="5"
```

Keep the existing Coder `30%` and other-role `20%` gradient start offsets. Preserve the existing acrylic fallback selector, sizing copy, layout, and responsive rules.

## Task 4: Verification

Run:

```bash
pnpm vitest run
pnpm type-check
pnpm exec eslint src/components/scramble/ScrambleAcrylicGlyph.vue src/components/scramble/ScrambleFrameText.vue src/components/scramble/test/ScrambleAcrylicGlyph.test.ts src/components/scramble/test/ScrambleFrameText.test.ts src/views/home/Home.vue src/views/home/test/Home.scramble.test.ts
pnpm build
```

Browser acceptance:

- At `1570 × 900`, confirm the stable X and transient characters keep the static acrylic material and baseline alignment.
- Move the mouse across the title and confirm the transform remains unchanged.
- At `390 × 844`, confirm there is no horizontal overflow or clipping.
- Review `git diff --check` and the final diff for unrelated changes.
