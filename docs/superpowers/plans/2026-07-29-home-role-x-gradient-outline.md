# Home Role X Gradient Outline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the homepage role suffix `X` as a thin, hollow SVG outline using the existing role-specific gradients.

**Architecture:** Extend `ScrambleFrameText` with an opt-in `accentOutline` rendering path that keeps the existing character-cell API and renders only the accent cell through SVG `<text>`. Split each role gradient into reusable start/end tokens, then map the active role tokens from `Home.vue` into the SVG stops without changing layout or scramble state.

**Tech Stack:** Vue 3.5, TypeScript, scoped CSS/SCSS, inline SVG, Vitest, Vue Test Utils.

## Global Constraints

- Keep the current Coder, Writer, Creator, and Builder gradient colors and 135-degree direction.
- Keep the current hero layout, title sizing, oblique suffix, cell width, gap, overflow, reserved desktop width, mobile behavior, and scramble timing.
- The suffix interior must be genuinely transparent; do not simulate it with the page background.
- Other `ScrambleFrameText` consumers must preserve ordinary text rendering unless they opt in.
- Add no dependencies.

---

### Task 1: Specify the outlined accent contract

**Files:**
- Modify: `src/components/scramble/test/ScrambleFrameText.test.ts`
- Modify: `src/views/home/test/Home.scramble.test.ts`

**Interfaces:**
- Consumes: existing `ScrambleFrameText` props `as`, `frame`, and `target`.
- Produces: tested optional prop `accentOutline?: boolean` and DOM classes `.scramble-accent-outline`, `.scramble-outline-glyph`, `.scramble-outline-character`, `.scramble-outline-gradient-start`, and `.scramble-outline-gradient-end`.

- [ ] **Step 1: Write the failing component test**

Add a test that mounts:

```ts
const wrapper = mount(ScrambleFrameText, {
  props: {
    frame: 'BuilderX',
    target: 'BuilderX',
    accentOutline: true,
  },
});
```

Assert that the accent cell has `.scramble-accent-outline`, contains one `.scramble-outline-glyph`, the SVG text is `X` with `fill="none"`, both gradient stops exist, and the text stroke references the generated gradient ID.

- [ ] **Step 2: Write the failing homepage integration contract**

Assert that both homepage `ScrambleFrameText` instances receive `accent-outline`, `common.scss` defines start/end tokens for all four roles, and `Home.vue` maps the active start/end variables for WriterX, CreatorX, and BuilderX.

- [ ] **Step 3: Verify RED**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleFrameText.test.ts src/views/home/test/Home.scramble.test.ts
```

Expected: FAIL because `accentOutline`, the SVG outline DOM, and the start/end tokens do not exist yet.

### Task 2: Implement the SVG gradient outline

**Files:**
- Modify: `src/components/scramble/ScrambleFrameText.vue`
- Modify: `src/assets/css/common.scss`
- Modify: `src/views/home/Home.vue`

**Interfaces:**
- Consumes: `accentOutline?: boolean`, the current accent index, `--scramble-accent-gradient-start`, and `--scramble-accent-gradient-end`.
- Produces: an accessible outer text label, hidden per-character SVG decoration, stable character-cell geometry, and unique SVG gradient IDs per component instance.

- [ ] **Step 1: Add the opt-in SVG branch**

Add `accentOutline?: boolean` with a default of `false`, create a unique gradient ID with `useId()`, and render this structure inside the existing accent cell:

```vue
<svg class="scramble-outline-glyph" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">
  <defs>
    <linearGradient :id="accentGradientId" x1="15%" y1="15%" x2="85%" y2="85%">
      <stop class="scramble-outline-gradient-start" offset="20%" />
      <stop class="scramble-outline-gradient-end" offset="100%" />
    </linearGradient>
  </defs>
  <text class="scramble-outline-character" x="50" y="86" text-anchor="middle" :stroke="`url(#${accentGradientId})`">
    {{ character }}
  </text>
</svg>
```

Keep interpolation as the fallback for ordinary cells and non-opted-in consumers.

- [ ] **Step 2: Style the outline without changing cell geometry**

Use `fill: none`, a thin non-scaling stroke, rounded joins/caps, inherited sans-serif oblique typography, `1em` SVG height, and `100%` width. Read the stop colors from:

```css
--scramble-accent-gradient-start
--scramble-accent-gradient-end
```

- [ ] **Step 3: Split the existing role gradients into reusable stops**

For each role in `common.scss`, define `--<role>-x-gradient-start` and `--<role>-x-gradient-end`, then rebuild `--<role>-x-gradient` from those exact values.

- [ ] **Step 4: Wire the homepage**

Pass `accent-outline` to both the visible and sizing `ScrambleFrameText` instances. In `.title-word`, initialize the SVG stop variables from Coder tokens; in the existing target selectors, switch them to Writer, Creator, and Builder tokens. Preserve the existing spacing and fallback filled-gradient styles for non-outline suffix consumers.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm vitest run src/components/scramble/test/ScrambleFrameText.test.ts src/views/home/test/Home.scramble.test.ts
```

Expected: all focused tests PASS with no warnings.

### Task 3: Verify production behavior

**Files:**
- Modify only if verification reveals a scoped defect.

**Interfaces:**
- Consumes: the completed component, homepage integration, and existing test/build scripts.
- Produces: verified desktop/mobile role suffix rendering without regressions.

- [ ] **Step 1: Run the relevant regression suites**

```bash
pnpm vitest run src/components/scramble/test src/views/home/test/Home.scramble.test.ts
```

Expected: all scramble and homepage tests PASS.

- [ ] **Step 2: Run static and production checks**

```bash
pnpm type-check
pnpm lint
pnpm build
```

Expected: every command exits `0`.

- [ ] **Step 3: Inspect desktop and mobile**

Start the Vite development server and inspect the homepage near 1570px and 390px widths. Confirm:

- the X interior shows the live page background;
- the outline is thin, crisp, and unclipped;
- BuilderX uses cyan-to-blue, with the other roles using their matching palettes;
- the suffix stays aligned during scramble frames;
- the hidden sizing title prevents desktop layout shifts;
- no horizontal clipping appears on mobile.

- [ ] **Step 4: Review the final diff**

Run `git diff --check` and `git status --short`. Confirm only the planned component, token, homepage, test, and documentation files changed.
