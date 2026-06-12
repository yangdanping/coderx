# CoderX Scramble Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable, configurable Scrambl-powered role-word cycle to the CoderX homepage while keeping the gradient `X` fixed.

**Architecture:** A single-animation child wraps `useScramble`; a cycling parent remounts that child for each word and starts its delay only after completion. Exported presets provide defaults, while explicit official option props take precedence.

**Tech Stack:** Vue 3.5, TypeScript, `@scrambl/vue`, `@scrambl/core` types, Vitest, Vue Test Utils, SCSS.

---

### Task 1: Export presets and public types

**Files:**
- Create: `src/components/scramble/scramble.constants.ts`
- Create: `src/components/scramble/scramble.types.ts`
- Test: `src/components/scramble/test/scramble.constants.test.ts`

- [ ] Write failing tests for the default words and preset exports.
- [ ] Run `pnpm vitest run src/components/scramble/test/scramble.constants.test.ts` and confirm the missing-module failure.
- [ ] Add typed presets, default preset, role words, and shared prop types.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Implement one scramble animation

**Files:**
- Create: `src/components/scramble/ScrambleWord.vue`
- Test: `src/components/scramble/test/ScrambleWord.test.ts`

- [ ] Mock `@scrambl/vue` and write failing tests proving all core options plus `trigger`, `playOnMount`, and `inViewOptions` reach `useScramble`.
- [ ] Add failing tests for callback props and emitted `start`, `change`, and `complete` events.
- [ ] Implement a `<script setup lang="ts">` wrapper around `useScramble`.
- [ ] Run the focused test and confirm it passes.

### Task 3: Implement completion-driven cycling

**Files:**
- Create: `src/components/scramble/CyclingScrambleText.vue`
- Test: `src/components/scramble/test/CyclingScrambleText.test.ts`

- [ ] Write failing fake-timer tests for completion, the 2000ms delay, and keyed word replacement.
- [ ] Add failing tests for explicit prop precedence, timer cleanup, single-word fallback, and reduced motion.
- [ ] Implement effective option merging and completion-driven cycling.
- [ ] Run the focused test and confirm it passes.

### Task 4: Integrate the homepage

**Files:**
- Modify: `src/views/home/Home.vue`
- Test: `src/views/home/test/Home.scramble.test.ts`

- [ ] Write a failing integration test proving the role words, default preset, and 2000ms delay are passed to the cycling component.
- [ ] Replace the manual typing state with `CyclingScrambleText` and a fixed `.title-x`.
- [ ] Preserve the existing gradient, typography, hover, layout, and responsive CSS.
- [ ] Run the focused integration test and confirm it passes.

### Task 5: Verify

**Files:**
- Modify only if verification finds a defect.

- [ ] Run `pnpm vitest run src/components/scramble/test src/views/home/test/Home.scramble.test.ts`.
- [ ] Run `pnpm type-check`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Start the Vite app and use the in-app browser to verify desktop and narrow layouts, fixed `X`, cycling order, and reduced-motion fallback.
- [ ] Review `git diff` to ensure unrelated user changes remain untouched.
