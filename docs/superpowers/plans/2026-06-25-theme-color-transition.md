# Theme Color Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centrally managed 300 ms light/dark color transition for explicit user switches, with reduced-motion behavior and explicit Tiptap coverage.

**Architecture:** `useTheme.ts` owns the transient `theme-transitioning` lifecycle and exposes timing through root CSS variables. A dedicated global stylesheet owns the explicit paint-property transition policy. Source-contract tests make Tiptap article, comment, Flow, toolbar, BubbleMenu, and AI-completion surfaces a named regression boundary.

**Tech Stack:** Vue 3 Composition API, TypeScript, SCSS, Vitest, Element Plus, Tiptap

---

## File Structure

- Modify `src/composables/useTheme.ts`: user-triggered transition lifecycle, reduced-motion detection, centralized duration/easing tokens, repeated-toggle cleanup.
- Modify `src/composables/test/useTheme.test.ts`: red/green behavior tests for animated and immediate theme application.
- Create `src/assets/css/theme-transition.scss`: global transient paint transition policy and Tiptap coverage registry.
- Modify `src/assets/css/index.scss`: import the theme transition policy once.
- Create `src/assets/css/test/theme-transition.test.ts`: source contracts for centralization, property safety, reduced motion, and Tiptap coverage.

### Component map

- `useTheme`: sole owner of theme state and transition lifecycle.
- `theme-transition.scss`: sole owner of which CSS paint properties interpolate.
- Tiptap components: retain local colors and structure; no duplicated transition duration declarations are added.

## Task 1: Specify the user-triggered transition lifecycle

**Files:**
- Modify: `src/composables/test/useTheme.test.ts`
- Modify: `src/composables/useTheme.ts`

- [ ] **Step 1: Make the media-query test helper query-aware**

Replace the single boolean `installMatchMedia` helper with options for system dark mode and reduced motion so the two preferences can be tested independently.

- [ ] **Step 2: Write failing lifecycle tests**

Add tests that assert:

```ts
const { setMode, toggleDark } = useTheme();

setMode('dark');
expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);
expect(document.documentElement.style.getPropertyValue('--theme-transition-duration')).toBe('300ms');

vi.advanceTimersByTime(300);
expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
```

Also cover repeated toggles, initialization without the class, and reduced motion without the class.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/composables/test/useTheme.test.ts
```

Expected: FAIL because `theme-transitioning` and centralized motion tokens do not exist.

- [ ] **Step 4: Implement the minimal lifecycle**

In `useTheme.ts`:

- define `THEME_TRANSITION_DURATION_MS = 300`;
- define the symmetric state-toggle easing;
- write both values to root CSS custom properties;
- add the transient class only for explicit user changes;
- force the transition rule to be resolved before changing the theme class;
- clear and restart the cleanup timer for repeated toggles;
- remove stale transition state before immediate initialization, system, or storage changes;
- skip interpolation when reduced motion is requested.

Keep `applyTheme()` as the only function that mutates `html.dark` and native `colorScheme`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/composables/test/useTheme.test.ts
```

Expected: all `useTheme` tests pass.

## Task 2: Specify the centralized SCSS policy

**Files:**
- Create: `src/assets/css/test/theme-transition.test.ts`
- Create: `src/assets/css/theme-transition.scss`
- Modify: `src/assets/css/index.scss`

- [ ] **Step 1: Write a failing source-contract test**

Read `theme-transition.scss`, `index.scss`, and the relevant Tiptap source files. Assert:

- the stylesheet is imported once;
- duration and easing come from CSS variables instead of duplicated literals;
- the transient root selector includes elements and pseudo-elements;
- the property list contains paint-only theme properties;
- `transition: all` and layout properties are absent;
- reduced-motion behavior exists;
- the Tiptap coverage registry names:
  - `.tiptap-editor-container`;
  - `.tiptap-toolbar`;
  - `.tiptap-bubble-menu`;
  - `.comment-editor-container`;
  - `.comment-toolbar`;
  - `.comment-bubble-menu`;
  - `.flow-editor-container`;
  - `.flow-bubble-menu`;
  - `.completion-popover`.

The test must also verify each registered class still exists in its owning component so stale registry entries fail visibly.

- [ ] **Step 2: Run the style test and verify RED**

Run:

```bash
pnpm vitest run src/assets/css/test/theme-transition.test.ts
```

Expected: FAIL because the stylesheet and registry do not exist.

- [ ] **Step 3: Implement the global transition policy**

Create `theme-transition.scss` with:

```scss
$theme-transition-tiptap-surfaces: (
  '.tiptap-editor-container',
  '.tiptap-toolbar',
  '.tiptap-bubble-menu',
  '.comment-editor-container',
  '.comment-toolbar',
  '.comment-bubble-menu',
  '.flow-editor-container',
  '.flow-bubble-menu',
  '.completion-popover'
);
```

Document that the list is a review/coverage registry; the transient root selector supplies actual coverage, including teleported overlays.

Apply only:

```scss
transition-property:
  color,
  background-color,
  border-color,
  outline-color,
  text-decoration-color,
  box-shadow,
  fill,
  stroke,
  filter,
  opacity;
transition-duration: var(--theme-transition-duration);
transition-timing-function: var(--theme-transition-easing);
```

Use a reduced-motion rule with effectively immediate duration. Do not animate gradients, layout properties, transforms, images, Canvas, or WebGL.

- [ ] **Step 4: Import the stylesheet**

Add one `@use './theme-transition';` entry to `src/assets/css/index.scss`.

- [ ] **Step 5: Run the style test and verify GREEN**

Run:

```bash
pnpm vitest run src/assets/css/test/theme-transition.test.ts
```

Expected: the theme transition contract passes.

## Task 3: Verify integration and regressions

**Files:**
- Verify only; do not change unrelated dirty files.

- [ ] **Step 1: Run both focused suites**

```bash
pnpm vitest run src/composables/test/useTheme.test.ts src/assets/css/test/theme-transition.test.ts
```

Expected: both suites pass.

- [ ] **Step 2: Run the full test suite**

```bash
pnpm vitest run
```

Expected: zero failing tests.

- [ ] **Step 3: Run type checking**

```bash
pnpm type-check
```

Expected: exit code 0.

- [ ] **Step 4: Run the production build**

```bash
pnpm build-only
```

Expected: exit code 0.

- [ ] **Step 5: Inspect the working-tree diff**

Confirm only the theme composable, its tests, global theme-transition stylesheet/import, and new style contract test changed. Preserve the existing unrelated dirty Feature Card files.

- [ ] **Step 6: Browser verification**

Start the app and verify:

- navbar theme button and `D` shortcut interpolate for about 300 ms;
- startup does not animate or flash;
- reduced motion switches immediately;
- article Tiptap container, toolbar, BubbleMenu, quote, inline code, table, and split preview transition together;
- comment and Flow editors transition together;
- AI completion popover transitions even though it is teleported to `body`;
- fixed dark code blocks remain stable;
- Canvas/WebGL surfaces redraw according to their existing local theme behavior.
