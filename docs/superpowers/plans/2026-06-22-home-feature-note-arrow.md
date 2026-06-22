# Home Feature Note And Arrow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage Feature heading with an anchored light-sweep arrow and restyle each Feature header as an animated yellow note with a one-shot hand-drawn solid green arrow.

**Architecture:** Add one focused SVG anchor component and keep all card-specific presentation inside `FeatureCard.vue`. Reuse the card's existing one-shot IntersectionObserver state, so no duplicate observer or global motion state is introduced. Preserve `HomeExploreLink.vue`, Feature demos, and activation behavior.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, scoped SCSS, inline SVG, CSS keyframes, existing `useFadeIn`, Vitest, Vue Test Utils, pnpm.

---

## File Structure

- Create `src/views/home/cpns/features/FeatureSectionAnchor.vue`: semantic `features` anchor and looping light-sweep arrow.
- Modify `src/views/home/cpns/features/FeatureSection.vue`: replace the old title/intro with `FeatureSectionAnchor`.
- Modify `src/views/home/cpns/features/FeatureCard.vue`: yellow note header, decorative solid arrow, one-shot entrance animation, theme and responsive styles.
- Create `src/views/home/cpns/features/test/FeatureSection.test.ts`: section anchor contract.
- Create `src/views/home/cpns/features/test/FeatureCard.test.ts`: note semantics, viewport trigger, motion/style contracts.

### Task 1: Section arrow anchor

**Files:**
- Create: `src/views/home/cpns/features/test/FeatureSection.test.ts`
- Create: `src/views/home/cpns/features/FeatureSectionAnchor.vue`
- Modify: `src/views/home/cpns/features/FeatureSection.vue`

- [ ] Write a failing component test that expects one `a#features[href="#features"]`, an accessible label, an arrow SVG, and no `How to Play` text.
- [ ] Run `pnpm vitest run src/views/home/cpns/features/test/FeatureSection.test.ts` and confirm it fails for the missing arrow anchor.
- [ ] Add `FeatureSectionAnchor.vue` with an inline SVG arrow, clipped moving highlight, focus state, responsive sizing, dark-mode color, and reduced-motion fallback.
- [ ] Replace the `SectionTitle` and intro paragraph in `FeatureSection.vue` with `FeatureSectionAnchor`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Feature note and one-shot guide arrow

**Files:**
- Create: `src/views/home/cpns/features/test/FeatureCard.test.ts`
- Modify: `src/views/home/cpns/features/FeatureCard.vue`

- [ ] Write failing markup tests that require a note wrapper containing the eyebrow, heading, and description plus an `aria-hidden` hand-drawn SVG with path and arrowhead classes.
- [ ] Write a failing visibility test with a controlled `IntersectionObserver` that requires the card's `visible` class to appear only after intersection.
- [ ] Write failing source-contract checks for the yellow `253 214 99` palette, dark-mode override, one-shot `stroke-dashoffset` animation, responsive rule, and reduced-motion fallback.
- [ ] Run `pnpm vitest run src/views/home/cpns/features/test/FeatureCard.test.ts` and confirm the expected failures.
- [ ] Replace the dot-grid header decoration with the paper-note wrapper and hand-drawn SVG while preserving all props, emits, activation timers, scroll mask, and demo slot behavior.
- [ ] Add stagger-aware note and path animation variables using the existing `delay` prop.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Integration and visual verification

**Files:**
- Verify: `src/views/home/cpns/features/FeatureSectionAnchor.vue`
- Verify: `src/views/home/cpns/features/FeatureSection.vue`
- Verify: `src/views/home/cpns/features/FeatureCard.vue`
- Verify unchanged: `src/views/home/cpns/HomeExploreLink.vue`

- [ ] Run both new Feature component tests together.
- [ ] Run the existing homepage test excluding the known-stale `HomeExploreLink.test.ts`.
- [ ] Run `pnpm type-check`.
- [ ] Run `pnpm build-only`.
- [ ] Start the Vite dev server and inspect the homepage in light and dark modes at desktop and mobile widths.
- [ ] Confirm the anchor lands on the arrow, the light sweep travels downward, every note remains readable, each guide arrow draws once, and reduced motion renders stable end states.
- [ ] Review `git diff -- src/views/home/cpns/HomeExploreLink.vue` and confirm it is empty.

### Task 4: Refine the guide and wall-mounted paper depth

**Files:**
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`
- Modify: `src/views/home/cpns/features/FeatureCard.vue`

- [ ] Add failing contracts for the `rgb(190 224 198)` solid stroke, full path-then-head timing, intact rectangular silhouette, and mirrored outer-edge curl.
- [ ] Replace the dotted warm-red stroke with a continuous green path and delay the arrowhead until the 2.4-second body draw is complete.
- [ ] Remove the clipped folded corner and create a localized underside highlight plus soft contact shadow at the lower-left or lower-right outer edge.
- [ ] Verify the note remains outside the demo panel and the connector remains unobstructed in both alternating positions.

### Task 5: Tighten the curl-guide choreography and expose paper curl strength

**Files:**
- Modify: `src/views/home/cpns/features/test/FeatureCard.test.ts`
- Modify: `src/views/home/cpns/features/FeatureCard.vue`

- [ ] Add failing tests for a compact loop near the guide start, a 40 ms body/head overlap, and a mirrored `noteCurlAngle` prop.
- [ ] Replace the long shallow path with a shorter hand-drawn loop that starts near the demo edge and resolves toward the note.
- [ ] Use a steadier body easing and begin the arrowhead at 2360 ms so the drawing reads as one continuous gesture.
- [ ] Default `noteCurlAngle` to 4 degrees, clamp unsafe values, document it briefly in Chinese, and map its sign from `noteSide`.
- [ ] Increase the localized underside highlight and contact shadow while keeping the note rectangular and the inner edge visually attached.
