# Home Feature Ambient Dimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reversible light-mode scroll transition that darkens the viewport while the home Feature story is active, keeps Feature text eye-friendly, and restores the light atmosphere before Hot Authors.

**Architecture:** A focused Vue composable converts the Feature zone's viewport rectangle into a clamped `0..1` ambient progress and updates it through a requestAnimationFrame-throttled listener. `Home.vue` exposes that progress as a CSS custom property which drives a fixed background surface plus Feature-local theme-token interpolation without mutating the stored/global theme.

**Tech Stack:** Vue 3.5 Composition API, TypeScript, scoped SCSS, CSS `color-mix()`, Vitest, Vue Test Utils.

## Global Constraints

- Apply ambient dimming only while the actual theme is light; dark mode keeps its current atmosphere.
- Use `--eye-white: #ededed` for primary dark/ambient text; do not introduce `#fff` for Feature text.
- Keep the navbar, stored theme mode, Feature layout, Hot Authors, and footer behavior unchanged.
- The response must be reversible on upward scrolling and must return to zero while Hot Authors enters the viewport.
- Do not add an animation dependency.
- Scroll work must be requestAnimationFrame-throttled and fully cleaned up on unmount.

---

## File Structure

- Create `src/views/home/composables/useFeatureAmbientDimming.ts`: pure progress calculation and Vue lifecycle/listener adapter.
- Create `src/views/home/composables/test/useFeatureAmbientDimming.test.ts`: entry, plateau, exit, throttling, and cleanup tests.
- Modify `src/views/home/Home.vue`: Feature-zone reference, ambient style binding, fixed dimming layer, and local interpolated theme tokens.
- Modify `src/assets/css/common.scss`: global semantic eye-white token and dark primary text consumption.
- Modify `src/views/home/cpns/features/demos/AiChatDemo.vue`: ambient blue surface and eye-white text.
- Modify `src/views/home/cpns/features/demos/AiCompletionDemo.vue`: ambient keyboard surface and eye-white text.
- Modify `src/views/home/cpns/features/FeatureSectionAnchor.vue`: remove pure-white SVG paint values.
- Modify `src/views/home/cpns/features/test/FeatureSection.test.ts`: visual contract assertions.

### Task 1: Deterministic ambient scroll progress

**Files:**
- Create: `src/views/home/composables/useFeatureAmbientDimming.ts`
- Create: `src/views/home/composables/test/useFeatureAmbientDimming.test.ts`

**Interfaces:**
- Produces: `calculateFeatureAmbientProgress(rect, viewportHeight, thresholds?) => number`.
- Produces: `useFeatureAmbientDimming({ rootRef, thresholds? })` returning readonly `progress` and `syncFromScroll()`.
- Uses default viewport ratios: entry starts at `0.82`, entry completes at `0.18`, exit starts at `0.92`, exit completes at `0.28`.

- [ ] **Step 1: Write failing progress tests**

Create tests using synthetic `{ top, bottom }` rectangles. Assert progress is `0` before entry, `0.5` midway through entry, `1` on the plateau, `0.5` midway through exit, and `0` after exit. Repeat an earlier rectangle after an exit rectangle to prove reverse scrolling is stateless.

```ts
expect(calculateFeatureAmbientProgress({ top: 820, bottom: 5000 }, 1000)).toBe(0);
expect(calculateFeatureAmbientProgress({ top: 500, bottom: 5000 }, 1000)).toBeCloseTo(0.5);
expect(calculateFeatureAmbientProgress({ top: 180, bottom: 5000 }, 1000)).toBe(1);
expect(calculateFeatureAmbientProgress({ top: -3000, bottom: 600 }, 1000)).toBeCloseTo(0.5);
expect(calculateFeatureAmbientProgress({ top: -4000, bottom: 280 }, 1000)).toBe(0);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run src/views/home/composables/test/useFeatureAmbientDimming.test.ts
```

Expected: FAIL because `useFeatureAmbientDimming` does not exist.

- [ ] **Step 3: Implement the pure calculator and composable**

Use two clamped ramps and take their minimum:

```ts
const entry = clamp((entryStartPx - rect.top) / (entryStartPx - entryEndPx), 0, 1);
const exit = clamp((rect.bottom - exitEndPx) / (exitStartPx - exitEndPx), 0, 1);
return Math.min(entry, exit);
```

In the composable, attach passive `scroll` and normal `resize` listeners on mount, schedule at most one animation frame, expose `syncFromScroll` for deterministic tests, and remove listeners/cancel the queued frame before unmount.

- [ ] **Step 4: Add lifecycle tests and verify GREEN**

Mount a harness component with a template ref. Assert repeated scroll events queue one frame, the frame updates progress, and unmount removes both listeners and cancels an outstanding frame.

Run the Step 2 command. Expected: all ambient composable tests PASS.

- [ ] **Step 5: Commit the isolated behavior**

```bash
git add src/views/home/composables/useFeatureAmbientDimming.ts src/views/home/composables/test/useFeatureAmbientDimming.test.ts
git commit -m "feat(home): add feature ambient scroll progress"
```

### Task 2: Light-mode atmosphere and eye-white tokens

**Files:**
- Modify: `src/views/home/Home.vue`
- Modify: `src/assets/css/common.scss`
- Modify: `src/views/home/cpns/features/demos/AiChatDemo.vue`
- Modify: `src/views/home/cpns/features/demos/AiCompletionDemo.vue`
- Modify: `src/views/home/cpns/features/FeatureSectionAnchor.vue`
- Modify: `src/views/home/cpns/features/test/FeatureSection.test.ts`

**Interfaces:**
- Consumes: readonly `progress` from `useFeatureAmbientDimming`.
- Produces: `--feature-ambient-progress`, `--feature-demo-blue-surface`, and `--eye-white` CSS contracts.

- [ ] **Step 1: Write failing visual contract assertions**

Extend the Feature source contract test to assert that:

```ts
expect(homeSource).toContain('useFeatureAmbientDimming');
expect(homeSource).toContain('--feature-ambient-progress');
expect(homeSource).toContain('html:not(.dark)');
expect(homeSource).toContain('color-mix');
expect(commonSource).toContain('--eye-white: #ededed');
expect(commonSource).toContain('--text-primary: var(--eye-white)');
expect(featureSources).not.toMatch(/(?:color|stop-color)\s*[:=]\s*["']?(?:#fff(?:fff)?|white)\b/i);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm exec vitest run src/views/home/cpns/features/test/FeatureSection.test.ts src/views/home/composables/test/useFeatureAmbientDimming.test.ts
```

Expected: the new visual contract assertions FAIL while the composable tests remain green.

- [ ] **Step 3: Bind progress and implement the fixed ambient layer**

Wrap `FeatureSection` in `ref="featureZone"`, bind the computed progress on the `.home` root, and add a fixed pseudo-element:

```ts
const featureZone = useTemplateRef<HTMLElement>('featureZone');
const { progress: featureAmbientProgress } = useFeatureAmbientDimming({ rootRef: featureZone });
const homeStyle = computed(() => ({ '--feature-ambient-progress': featureAmbientProgress.value.toFixed(4) }));
```

```scss
:where(html:not(.dark)) &::before {
  opacity: calc(var(--feature-ambient-progress) * 0.94);
}
```

Keep the layer fixed, pointer-transparent, behind home content, and disabled under `html.dark`.

- [ ] **Step 4: Interpolate Feature-local theme variables**

Under `html:not(.dark)`, interpolate primary/secondary text, glass surfaces, borders, and preview-specific pale-blue surfaces with `color-mix()` and `calc(var(--feature-ambient-progress) * 100%)`. Do not change the surrounding Hero or Hot Authors variables.

Add `--eye-white: #ededed` to `:root`, set dark `--text-primary: var(--eye-white)`, replace Feature demo `white`/`#ffffff` paint with `var(--eye-white)`, and route pale-blue demo surfaces through `--feature-demo-blue-surface`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused Feature and ambient tests PASS.

- [ ] **Step 6: Commit the visual integration**

```bash
git add src/views/home/Home.vue src/assets/css/common.scss src/views/home/cpns/features/demos/AiChatDemo.vue src/views/home/cpns/features/demos/AiCompletionDemo.vue src/views/home/cpns/features/FeatureSectionAnchor.vue src/views/home/cpns/features/test/FeatureSection.test.ts
git commit -m "feat(home): dim feature story in light mode"
```

### Task 3: Integrated verification and visual acceptance

**Files:**
- Modify only Task 1-2 files if verification reveals a scoped defect.

**Interfaces:**
- Validates the feature as one independently acceptable home-page stage.

- [ ] **Step 1: Run static and production verification**

Run:

```bash
pnpm run type-check
pnpm run build-only
git diff --check HEAD~2
```

Expected: type-check exits `0`, Vite production build exits `0`, and diff check reports no whitespace errors.

- [ ] **Step 2: Run the complete test suite**

Run:

```bash
pnpm exec vitest run
```

Expected: all frontend tests PASS. If an unrelated pre-existing failure appears, record its exact command/output and keep the focused suite green.

- [ ] **Step 3: Inspect desktop light and dark modes**

At approximately `1440x900`, verify: Hero is light; Feature entrance smoothly darkens; the central Feature plateau uses readable `#ededed` primary text and dark preview surfaces; the transition reverses before Hot Authors; switching to dark mode produces no duplicate overlay or flash.

- [ ] **Step 4: Inspect mobile and reduced motion**

At approximately `390x844`, verify stacked Feature demos remain readable and no horizontal overflow appears. With `prefers-reduced-motion: reduce`, verify the scroll-linked color result remains deterministic and no extra opacity easing is introduced.

- [ ] **Step 5: Review repository state**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: only pre-existing user changes remain unstaged; the design and two scoped implementation commits are present.
