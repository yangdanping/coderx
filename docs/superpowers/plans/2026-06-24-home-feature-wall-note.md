# Home Feature Wall Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop Feature note read as paper attached along its top edge with only the lower outer corner lifting from the wall.

**Architecture:** Keep `FeatureCard.vue` as the visual owner, but split the note markup into an entrance/placement wrapper and a semantic paper sheet with three decorative layers: contact band, localized wall shadow, and corner curl. Preserve the existing props and mobile fallback; reinterpret `noteCurlAngle` as normalized local lift intensity instead of whole-sheet Y rotation.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, scoped SCSS, CSS gradients/transforms/masks, Vitest, Vue Test Utils, pnpm.

---

## File Structure

- Modify `src/views/home/cpns/features/FeatureCard.vue`: add layered note markup, normalized lift variables, desktop paper styling, dark theme, mobile reset, and reduced-motion final state.
- Modify `src/views/home/cpns/features/test/FeatureCard.test.ts`: define markup and CSS contracts for believable wall attachment and protect the mobile fallback.

### Task 1: Define the paper-layer contract

**Files:**
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [ ] **Step 1: Add a failing markup test**

Require `.feature-card__note` to contain `.feature-card__note-shadow`, `.feature-card__note-sheet`, `.feature-card__note-contact`, and `.feature-card__note-curl`. Require all three decorative elements to use `aria-hidden="true"` while the eyebrow, heading, and description remain inside the sheet.

- [ ] **Step 2: Add failing physical-model source contracts**

Require:

- `--note-lift-strength` and mirrored `--note-lift-direction` inline variables;
- a localized shadow width below `50%`;
- a top contact layer;
- the desktop sheet to avoid `backdrop-filter: blur(10px)`;
- the final visible note transform to avoid `rotateY(var(--note-curl-tilt-y))`;
- no commented-out legacy `&::before` / `&::after` block.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/views/home/cpns/features/test/FeatureCard.test.ts
```

Expected: FAIL because the new paper layers and lift variables do not exist.

### Task 2: Implement the attached paper model

**Files:**
- Modify: `src/views/home/cpns/features/FeatureCard.vue`

- [ ] **Step 1: Add the layered note markup**

Keep `.feature-card__note` as the wrapper. Add the decorative shadow as its first child, wrap the semantic text in `.feature-card__note-sheet`, and add contact and curl spans inside the sheet.

- [ ] **Step 2: Normalize the lift input**

Clamp `noteCurlAngle` as today, expose `--note-lift-strength` from `0` to `1`, and expose `--note-lift-direction` as `-1` for left notes and `1` for right notes. Remove the whole-note `--note-curl-tilt-y` mapping.

- [ ] **Step 3: Move material styling onto the sheet**

Make the sheet mostly opaque warm paper with broad low-contrast lighting and localized corner darkening. Keep a fine warm edge and only a tight ambient shadow around the complete sheet.

- [ ] **Step 4: Implement consistent attachment cues**

Use:

- a narrow top contact gradient;
- an outer-third blurred cast shadow positioned by `noteSide`;
- a curved, masked underside highlight at the same lower corner;
- top-edge transform origin and minimal whole-sheet X tilt;
- mirrored left/right variables instead of duplicated markup.

- [ ] **Step 5: Preserve theme and fallback behavior**

Tune the same layers for dark mode. At `max-width: 768px`, hide decorative paper layers and reset `.feature-card__note-sheet` to the existing transparent unified-card header. Keep reduced-motion rendering in the final attached state.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/views/home/cpns/features/test/FeatureCard.test.ts
```

Expected: all FeatureCard tests pass.

### Task 3: Visual tuning and regression verification

**Files:**
- Verify: `src/views/home/cpns/features/FeatureCard.vue`
- Verify: `src/views/home/cpns/features/test/FeatureCard.test.ts`

- [ ] **Step 1: Run static verification**

Run:

```bash
pnpm eslint src/views/home/cpns/features/FeatureCard.vue src/views/home/cpns/features/test/FeatureCard.test.ts
pnpm type-check
pnpm build-only
```

- [ ] **Step 2: Inspect the real homepage**

Start Vite and inspect at least one left note and one right note in light and dark themes. Confirm:

- the top edge reads as attached;
- the complete sheet no longer looks like a rigid Y-rotated board;
- only the outer lower corner lifts;
- the shadow remains connected to the curl;
- text contrast and guide-arrow placement remain intact.

- [ ] **Step 3: Verify mobile and reduced motion**

At the 768 px breakpoint, confirm the contact, curl, and cast shadow are absent and the unified mobile Feature card remains unchanged. Confirm reduced motion shows a stable final state.

- [ ] **Step 4: Review the final diff**

Confirm no Feature data, demo behavior, guide-arrow geometry, scroll-mask logic, or unrelated files changed.
