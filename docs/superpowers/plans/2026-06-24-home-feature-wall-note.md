# Home Feature Wall Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop Feature note read as paper attached along its top edge with only the lower outer corner lifting from the wall.

**Architecture:** Keep `FeatureCard.vue` as the visual owner, but split the note markup into an entrance/placement wrapper and a semantic paper sheet with one decorative layer: a localized wall shadow. Preserve the existing props and unified narrow-layout fallback; reinterpret `noteCurlAngle` as normalized local lift intensity instead of whole-sheet Y rotation. Do not add a separate protruding curl/underside layer or top contact band.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, scoped SCSS, CSS gradients/transforms/masks, Vitest, Vue Test Utils, pnpm.

---

## File Structure

- Modify `src/views/home/cpns/features/FeatureCard.vue`: add layered note markup, normalized lift variables, desktop paper styling, dark theme, mobile reset, and reduced-motion final state.
- Modify `src/views/home/cpns/features/test/FeatureCard.test.ts`: define markup and CSS contracts for believable wall attachment and protect the mobile fallback.

### Task 1: Define the paper-layer contract

**Files:**
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [x] **Step 1: Add a failing markup test**

Require `.feature-card__note` to contain `.feature-card__note-shadow`, `.feature-card__note-sheet`, and `.feature-card__note-contact`. Require both decorative elements to use `aria-hidden="true"` while the eyebrow, heading, and description remain inside the sheet, and explicitly reject a separate curl element.

- [x] **Step 2: Add failing physical-model source contracts**

Require:

- a normalized `--note-lift-strength` inline variable;
- a localized shadow width below `50%`;
- a top contact layer;
- the desktop sheet to avoid `backdrop-filter: blur(10px)`;
- the final visible note transform to avoid `rotateY(var(--note-curl-tilt-y))`;
- no commented-out legacy `&::before` / `&::after` block.

- [x] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/views/home/cpns/features/test/FeatureCard.test.ts
```

Expected: FAIL because the new paper layers and lift variables do not exist.

### Task 2: Implement the attached paper model

**Files:**
- Modify: `src/views/home/cpns/features/FeatureCard.vue`

- [x] **Step 1: Add the layered note markup**

Keep `.feature-card__note` as the wrapper. Add the decorative shadow as its first child, wrap the semantic text in `.feature-card__note-sheet`, and add the contact span inside the sheet.

- [x] **Step 2: Normalize the lift input**

Clamp `noteCurlAngle` as today and expose `--note-lift-strength` from `0` to `1`. Remove the whole-note `--note-curl-tilt-y` mapping and any curl-direction variable.

- [x] **Step 3: Move material styling onto the sheet**

Make the sheet mostly opaque warm paper with broad low-contrast lighting and localized corner darkening. Keep a fine warm edge and only a tight ambient shadow around the complete sheet.

- [x] **Step 4: Implement consistent attachment cues**

Use:

- a narrow top contact gradient;
- an outer-third blurred cast shadow positioned by `noteSide`;
- localized shading within the paper surface at the same lower corner;
- top-edge transform origin and minimal whole-sheet X tilt;
- mirrored left/right variables instead of duplicated markup.

- [x] **Step 5: Preserve theme and fallback behavior**

Tune the same layers for dark mode. At `max-width: 1319px`, hide the guide and shadow layer and reset `.feature-card__note-sheet` to the existing transparent unified-card header. Keep reduced-motion rendering in the final attached state.

- [x] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/views/home/cpns/features/test/FeatureCard.test.ts
```

Expected: all FeatureCard tests pass.

### Task 3: Visual tuning and regression verification

**Files:**
- Verify: `src/views/home/cpns/features/FeatureCard.vue`
- Verify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [x] **Step 1: Run static verification**

Run:

```bash
pnpm eslint src/views/home/cpns/features/FeatureCard.vue src/views/home/cpns/features/test/FeatureCard.test.ts
pnpm type-check
pnpm build-only
```

- [x] **Step 2: Inspect the real homepage**

Start Vite and inspect at least one left note and one right note in light and dark themes. Confirm:

- the top edge reads as attached;
- the complete sheet no longer looks like a rigid Y-rotated board;
- only the outer lower corner lifts;
- the shadow remains visually connected to the shaded outer corner;
- text contrast and guide-arrow placement remain intact.

- [x] **Step 3: Verify mobile and reduced motion**

At `1319px`, confirm the cast shadow is absent and the unified Feature card is used; at `1320px`, confirm the side note returns. Confirm reduced motion shows a stable final state.

- [x] **Step 4: Review the final diff**

Confirm no Feature data, demo behavior, guide-arrow geometry, scroll-mask logic, or unrelated files changed.

### Task 4: Remove the artificial underside flap

**Files:**
- Modify: `src/views/home/cpns/features/FeatureCard.vue`
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [x] **Step 1: Reject a separate curl layer**

Update markup and source contracts so `.feature-card__note-curl` and its direction variables cannot return.

- [x] **Step 2: Remove the curl implementation**

Delete the curl span, mask, gradients, 3D transforms, and curl-only variables. Keep the paper silhouette intact and retain only the localized corner shading and soft cast shadow.

- [x] **Step 3: Re-run focused verification**

Run the focused FeatureCard test and confirm all tests pass.

### Task 5: Remove the intermediate top-note layout

**Files:**
- Modify: `src/views/home/cpns/features/FeatureCard.vue`
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [x] **Step 1: Protect the content-driven breakpoint**

Require the unified card layout through `1319px` and reject the previous `768px` cutoff.

- [x] **Step 2: Extend the unified card layout**

Change the narrow-layout media query to `max-width: 1319px`; keep the alternating side-note layout at `min-width: 1320px`.

- [x] **Step 3: Run the focused test**

Confirm all FeatureCard tests pass.

### Task 6: Remove the artificial top contact band

**Files:**
- Modify: `src/views/home/cpns/features/FeatureCard.vue`
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [x] **Step 1: Reject the contact-band layer**

Require `.feature-card__note-contact` and its color variable to be absent.

- [x] **Step 2: Remove the contact-band implementation**

Delete the decorative span, its gradient block, and light/dark contact-shade variables. Keep only the sheet's fine border at the top edge.

- [x] **Step 3: Run the focused test**

Confirm all FeatureCard tests pass.
