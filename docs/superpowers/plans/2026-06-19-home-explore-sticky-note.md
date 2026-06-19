# Home Explore Canvas Page Curl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage `Start Exploring` CSS curl with a flat Canvas 2D paper note whose bottom-right page lift follows the pointer in the restrained StPageFlip-inspired direction approved by the user.

**Architecture:** Keep `HomeExploreLink.vue` as one focused component: `RouterLink` owns semantics and navigation, while an `aria-hidden` Canvas owns the full paper front, exposed surface, and reverse fold. Canvas state stays non-reactive because it is frame-local imperative drawing state; Vue lifecycle hooks only create and clean up browser observers/listeners. `Home.vue` remains unchanged unless real-page verification exposes an integration defect.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, Vue Router, Canvas 2D, cubic Bézier paths, `ResizeObserver`, `MutationObserver`, `matchMedia`, Vitest, Vue Test Utils, SCSS.

---

## File Structure

- Modify `src/views/home/cpns/HomeExploreLink.vue`: semantic link, Canvas lifecycle, page-curl geometry, pointer/touch/focus interaction, theme and responsive styles.
- Modify `src/views/home/cpns/test/HomeExploreLink.test.ts`: Canvas/browser mocks and behavioral contract tests.
- Verify only `src/views/home/Home.vue`: retain the existing component placement and preserve the user's diffuse hero background edits.
- Verify `src/views/home/test/Home.scramble.test.ts`: ensure the existing placement contract still passes.

### Component map

- `Home.vue`: route-level composition only; already positions `HomeExploreLink`.
- `HomeExploreLink.vue`: owns one semantic navigation surface and its decorative Canvas rendering; no props or emits are needed.
- `RouterLink`: public interaction contract; visible label remains the accessible name.
- Canvas: decorative implementation detail; never receives focus or pointer events.

## Task 1: Replace the legacy visual contract

**Files:**
- Modify: `src/views/home/cpns/test/HomeExploreLink.test.ts`
- Modify: `src/views/home/cpns/HomeExploreLink.vue`

- [ ] **Step 1: Write failing markup and source-contract tests**

Update the existing tests to require:

```ts
it('renders one decorative canvas behind the semantic link', () => {
  const wrapper = mountLink();
  const canvas = wrapper.get('canvas.home-explore-link__canvas');

  expect(canvas.attributes('aria-hidden')).toBe('true');
  expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({ name: 'article' });
  expect(wrapper.get('.home-explore-link__label').text()).toBe('Start Exploring');
});

it('removes the legacy CSS curl and ASCII shadow treatment', () => {
  const wrapper = mountLink();
  const source = readSource();

  expect(wrapper.find('.home-explore-link__ascii-shadow').exists()).toBe(false);
  expect(wrapper.find('.home-explore-link__curl').exists()).toBe(false);
  expect(wrapper.find('.home-explore-link__contact-shadow').exists()).toBe(false);
  expect(source).not.toMatch(/linear-gradient|radial-gradient|repeating-linear-gradient/);
  expect(source).not.toContain('box-shadow: inset');
  expect(source).not.toContain('filter:');
  expect(source).not.toContain('░');
  expect(source).not.toContain('▒');
  expect(source).not.toContain('▓');
});
```

Keep the existing named-route and visible-copy assertion.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: FAIL because the component still renders the ASCII shadow, CSS paper, curl, and contact shadow instead of a Canvas.

- [ ] **Step 3: Replace the template and legacy SCSS with the minimal semantic shell**

Use this structure:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');
</script>

<template>
  <RouterLink class="home-explore-link" :to="{ name: 'article' }">
    <canvas ref="canvas" class="home-explore-link__canvas" aria-hidden="true"></canvas>
    <span class="home-explore-link__label">Start Exploring</span>
  </RouterLink>
</template>
```

Add only the flat layout styles needed for:

- `position: relative`, overflow visibility, fixed interactive height, and fluid width;
- an absolute full-size Canvas with `pointer-events: none`;
- a stationary label above the Canvas;
- visible `:focus-visible`;
- a small active transform;
- 320 px-safe sizing and centered behavior inherited from `Home.vue`;
- solid light/dark CSS custom properties.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: PASS for semantic markup and removal tests; Canvas behavior tests have not been added yet.

## Task 2: Draw the flat page and StPageFlip-style fold

**Files:**
- Modify: `src/views/home/cpns/test/HomeExploreLink.test.ts`
- Modify: `src/views/home/cpns/HomeExploreLink.vue`

- [ ] **Step 1: Add deterministic Canvas and resize mocks**

Create focused test doubles for:

```ts
const context = {
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
};
```

Stub `HTMLCanvasElement.prototype.getContext`, `ResizeObserver`, `requestAnimationFrame`, `cancelAnimationFrame`, `matchMedia`, and element `getBoundingClientRect()`. Restore all globals after each test.

- [ ] **Step 2: Write failing initial-draw and DPR tests**

Add tests that assert:

- Canvas backing size becomes CSS width/height multiplied by a DPR capped at `2`.
- `setTransform(dpr, 0, 0, dpr, 0, 0)` is called.
- the drawing uses at least two `bezierCurveTo` calls and three solid fills for exposed surface, paper front, and reverse fold;
- `createLinearGradient`, `createRadialGradient`, `shadowBlur`, and filter APIs are never used;
- triggering the captured `ResizeObserver` callback redraws and resizes.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: FAIL because the Canvas lifecycle and drawing functions do not exist.

- [ ] **Step 4: Implement minimal Canvas sizing and geometry**

In `HomeExploreLink.vue`:

- keep drawing state in plain typed objects, not Vue reactive state;
- derive the rendered anchor from `canvas.parentElement` and read its CSS custom properties with `getComputedStyle`;
- cap `window.devicePixelRatio` at `2`;
- draw in CSS pixels after `setTransform`;
- calculate a resting pull point, bottom fold intersection, and right-edge fold intersection;
- draw three closed solid-color paths:
  1. exposed surface below the lifted paper;
  2. paper front clipped by a continuous cubic Bézier fold boundary;
  3. broad reverse side bounded by cubic Bézier curves;
- instantiate `ResizeObserver` when available and use a window resize fallback only when unavailable.

The geometry must avoid `arc`, circular masks, straight triangular cutouts, gradients, and shadows.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: PASS.

## Task 3: Add pointer-follow, focus, touch, and reduced-motion behavior

**Files:**
- Modify: `src/views/home/cpns/test/HomeExploreLink.test.ts`
- Modify: `src/views/home/cpns/HomeExploreLink.vue`

- [ ] **Step 1: Write failing interaction tests**

Test these observable behaviors:

- `pointerenter` targets the expanded fold and schedules animation.
- `pointermove` converts client coordinates into normalized, clamped local coordinates and changes later Bézier control-point calls.
- `pointerleave` targets the resting fold and schedules restoration.
- focus expands with a stable centered pointer target; blur restores.
- non-mouse `pointerdown` expands and `pointerup`/`pointercancel` restores.
- pointer movement does not mutate the label or RouterLink box.

Use queued animation-frame callbacks so each state transition can be advanced deterministically.

- [ ] **Step 2: Write a failing reduced-motion test**

Stub `matchMedia('(prefers-reduced-motion: reduce)')` with `matches: true` and assert that interaction redraws immediately without leaving a scheduled animation frame.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: FAIL because events do not yet drive the fold.

- [ ] **Step 4: Implement bounded animation state**

Add:

- current and target openness;
- current and target normalized pointer coordinates;
- fine-pointer hover state, keyboard-focus state, and coarse-pointer press state;
- one `requestAnimationFrame` loop that starts on demand and stops when settled;
- quintic-style natural deceleration without bounce;
- strict geometry bounds so the fold cannot cover the label or leave the Canvas;
- immediate target application when reduced motion is active;
- handlers attached declaratively to `RouterLink`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: PASS.

## Task 4: Add theme redraw and lifecycle cleanup

**Files:**
- Modify: `src/views/home/cpns/test/HomeExploreLink.test.ts`
- Modify: `src/views/home/cpns/HomeExploreLink.vue`

- [ ] **Step 1: Write failing theme and cleanup tests**

Assert that:

- CSS custom properties provide front, reverse, exposed-surface, ink, and focus colors;
- a root-class `MutationObserver` redraws when dark mode changes;
- a reduced-motion media-query change redraws and settles state;
- unmount disconnects `ResizeObserver` and `MutationObserver`, removes media-query/window listeners, and cancels any pending animation frame.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: FAIL because theme observation and complete cleanup are missing.

- [ ] **Step 3: Implement theme observation and cleanup**

Use:

- `MutationObserver` on `document.documentElement` with `{ attributes: true, attributeFilter: ['class'] }`;
- `MediaQueryList.addEventListener('change', ...)` with the legacy listener fallback only if necessary;
- `onUnmounted` cleanup for observers, listeners, and RAF;
- solid dark-mode variable overrides under `:where(html.dark)`.

- [ ] **Step 4: Run component and homepage placement tests**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts src/views/home/test/Home.scramble.test.ts
```

Expected: PASS.

## Task 5: Verify on the real homepage and refine without widening scope

**Files:**
- Modify only if findings require it:
  - `src/views/home/cpns/HomeExploreLink.vue`
  - `src/views/home/cpns/test/HomeExploreLink.test.ts`
- Do not modify:
  - navbar files
  - Flow files
  - the user's diffuse-background code in `src/views/home/Home.vue`

- [ ] **Step 1: Start the local app**

Run:

```bash
pnpm dev
```

- [ ] **Step 2: Verify desktop light mode**

On the real homepage:

- the paper is flat and solid, with no highlight, gradient, inner shadow, blur, or ASCII shadow;
- the resting fold is small but legible;
- hover creates a broad StPageFlip-like lifted sheet;
- moving the pointer subtly changes the fold spine and pull point;
- leaving restores smoothly;
- label and link hit area do not move;
- no overlap with the title or shader.

- [ ] **Step 3: Verify keyboard and navigation**

- Tab to the link and confirm a visible focus ring plus stable expanded fold.
- Activate with Enter and confirm the URL becomes `/article`.
- Return to the homepage for remaining checks.

- [ ] **Step 4: Verify dark mode**

- Toggle the real app theme.
- Confirm Canvas colors redraw without page reload.
- Confirm yellow identity, reverse-side distinction, and label contrast remain clear.

- [ ] **Step 5: Verify mobile and touch behavior**

At 390 px and 320 px:

- no horizontal overflow;
- link remains at least 44 px high;
- note remains centered in the stacked hero;
- simulated touch press expands and release restores;
- no functionality depends on hover.

- [ ] **Step 6: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce` and confirm fold states update immediately without interpolated motion.

## Task 6: Final verification

**Files:**
- Verify all scoped changes.

- [ ] **Step 1: Run focused tests**

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts src/views/home/test/Home.scramble.test.ts
```

- [ ] **Step 2: Run the complete test suite**

```bash
pnpm vitest run
```

- [ ] **Step 3: Run lint on changed feature files**

```bash
pnpm eslint src/views/home/cpns/HomeExploreLink.vue src/views/home/cpns/test/HomeExploreLink.test.ts
```

- [ ] **Step 4: Run type-check**

```bash
pnpm type-check
```

- [ ] **Step 5: Run production build**

```bash
pnpm build-only
```

- [ ] **Step 6: Inspect the final diff**

```bash
git diff --check
git diff -- src/views/home/cpns/HomeExploreLink.vue src/views/home/cpns/test/HomeExploreLink.test.ts
git status --short
```

Confirm the diff does not include navbar, Flow, or the user's homepage background changes.
