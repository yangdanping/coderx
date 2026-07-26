# Notion-Style Article TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the intrusive always-open desktop article table of contents with a Notion-style rail that temporarily expands on hover/focus and can be pinned open by click.

**Architecture:** Keep all feature state local to `DetailToc.vue`: derive the effective desktop open state from hover, focus-within, pinned, and dismissed state. The existing `titles` prop and page-scroll detection remain the data source; the parent grid and mobile drawer stay unchanged. Replace the fixed-height moving slider with active styles attached to each real anchor, so wrapped titles cannot desynchronize the indicator.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, SCSS, Vue Test Utils, Vitest, jsdom.

## Global Constraints

- Desktop breakpoint remains `993px`; `992px` and below continue to use the existing Drawer.
- The expanded panel stays within the existing approximately `220px` right column.
- Expanded list height is capped at `min(60vh, 520px)`.
- No new UI, state, or persistence dependencies.
- `ArticleTocDemo.vue`, the article heading extractor, the parent three-column grid, and the left interaction panel remain unchanged.
- Preserve light/dark theme variables and provide a `prefers-reduced-motion` fallback.
- Preserve unrelated working-tree changes in `package.json`, `pnpm-lock.yaml`, `NavBarActionPanel.vue`, and `Home.vue`.

---

### Task 1: Lock the desktop interaction contract with component tests

**Files:**
- Create: `src/views/detail/cpns/detail/test/DetailToc.test.ts`
- Modify: `src/views/detail/cpns/detail/DetailToc.vue`

**Interfaces:**
- Consumes: `titles: DetailTocTitle[]`
- Produces: `.toc-desktop.is-expanded`, `.toc-desktop.is-pinned`, `.toc-rail-toggle`, `.toc-link`, `aria-expanded`, and `aria-current="location"` as the observable interaction contract.

- [ ] **Step 1: Write the failing interaction tests**

Create a factory that mounts `DetailToc` with three headings and stubs `ElDrawer`. Add focused tests equivalent to:

```ts
it('temporarily expands on hover and collapses on leave', async () => {
  const wrapper = mountDetailToc();
  expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-expanded');

  await wrapper.get('.toc-desktop').trigger('mouseenter');
  expect(wrapper.get('.toc-desktop').classes()).toContain('is-expanded');
  expect(wrapper.get('.toc-rail-toggle').attributes('aria-expanded')).toBe('true');

  await wrapper.get('.toc-desktop').trigger('mouseleave');
  expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-expanded');
});

it('pins by click and dismisses with Escape', async () => {
  const wrapper = mountDetailToc();
  await wrapper.get('.toc-rail-toggle').trigger('click');
  expect(wrapper.get('.toc-desktop').classes()).toContain('is-pinned');

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  await nextTick();
  expect(wrapper.get('.toc-desktop').classes()).not.toContain('is-expanded');
  expect(wrapper.get('.toc-rail-toggle').attributes('aria-expanded')).toBe('false');
});

it('uses real anchors and marks the current location', () => {
  const wrapper = mountDetailToc();
  const links = wrapper.findAll<HTMLAnchorElement>('.toc-link');
  expect(links[0]?.attributes('href')).toBe('#article-header-0');
  expect(links[0]?.attributes('aria-current')).toBe('location');
});
```

Also cover focus-within temporary expansion, outside pointer dismissal, click-lock persistence after mouseleave, smooth scroll offset, and the unchanged mobile Drawer close-after-selection behavior.

- [ ] **Step 2: Run the focused component test and verify RED**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/DetailToc.test.ts
```

Expected: FAIL because `.toc-rail-toggle`, expanded/pinned classes, anchor semantics, and dismissal behavior do not exist.

- [ ] **Step 3: Implement minimal desktop state and semantics**

In `DetailToc.vue`, add local refs and one derived state:

```ts
const isHovered = ref(false);
const hasFocusWithin = ref(false);
const isPinnedOpen = ref(false);
const isDismissed = ref(false);
const isDesktopExpanded = computed(
  () => !isDismissed.value && (isHovered.value || hasFocusWithin.value || isPinnedOpen.value),
);
```

Add handlers for pointer enter/leave, focus enter/leave, toggle click, document `pointerdown`, and window `keydown`. Escape must set `isDismissed`, clear `isPinnedOpen`, and return focus to the rail button without immediately reopening. Register and remove global listeners in the existing lifecycle hooks.

Render a focusable `.toc-rail-toggle` with `aria-controls`, `aria-expanded`, and a visually hidden label. Render desktop entries as `.toc-link` anchors with `href`, `aria-current`, and `tabindex="-1"` while collapsed.

- [ ] **Step 4: Run the focused component test and verify GREEN**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/DetailToc.test.ts
```

Expected: all `DetailToc.test.ts` tests PASS.

- [ ] **Step 5: Commit the interaction slice**

```bash
git add src/views/detail/cpns/detail/DetailToc.vue src/views/detail/cpns/detail/test/DetailToc.test.ts
git commit -m "feat(toc): add notion-style desktop interaction"
```

### Task 2: Replace the intrusive desktop visual treatment

**Files:**
- Modify: `src/views/detail/cpns/detail/DetailToc.vue`
- Modify: `src/views/detail/cpns/detail/test/TocStyleContract.test.ts`

**Interfaces:**
- Consumes: the state classes and anchor selectors from Task 1.
- Produces: `.toc-rail`, `.toc-rail__tick`, `.toc-panel`, `.toc-panel__header`, `.toc-list-shell`, and reduced-motion styling.

- [ ] **Step 1: Rewrite the style contract test to describe the new treatment**

Keep the homepage demo assertions scoped to `ArticleTocDemo.vue`. Replace detail-page slider assertions with checks equivalent to:

```ts
expect(detailSource).toContain('toc-rail__tick');
expect(detailSource).toContain('toc-panel');
expect(detailSource).toMatch(/max-height:\s*min\\(60vh,\s*520px\\)/);
expect(detailSource).toContain('text-overflow: ellipsis');
expect(detailSource).toContain('@media (prefers-reduced-motion: reduce)');
expect(detailSource).not.toContain('TOC_ITEM_HEIGHT');
expect(detailSource).not.toContain('--toc-active-y');
expect(detailSource).not.toContain('toc-active-slider');
```

Continue asserting `#81c995` for light mode and `#c0e0c7` for dark mode.

- [ ] **Step 2: Run the style contract and verify RED**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/TocStyleContract.test.ts
```

Expected: FAIL because the current detail TOC still uses the fixed-height moving slider and full-height list.

- [ ] **Step 3: Implement the rail and expanded panel styles**

Implement these concrete visual rules:

```scss
.toc-rail {
  display: flex;
  width: 24px;
  height: clamp(132px, 24vh, 220px);
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.toc-panel {
  position: absolute;
  inset: 0 auto auto 0;
  width: 220px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(-8px, 0, 0);
}

.toc-desktop.is-expanded .toc-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate3d(0, 0, 0);
}

.toc-list-shell {
  max-height: min(60vh, 520px);
  overflow-y: auto;
}
```

Use a solid themed surface with a restrained shadow, a `14px / 600` header, a current/total counter, single-line ellipsis for ordinary links, and a two-line clamp for the active link. Attach the active dot/color to `.toc-item.active` instead of using absolute index math.

- [ ] **Step 4: Run both TOC tests and verify GREEN**

Run:

```bash
pnpm exec vitest run \
  src/views/detail/cpns/detail/test/DetailToc.test.ts \
  src/views/detail/cpns/detail/test/TocStyleContract.test.ts
```

Expected: both test files PASS.

- [ ] **Step 5: Commit the visual slice**

```bash
git add src/views/detail/cpns/detail/DetailToc.vue src/views/detail/cpns/detail/test/TocStyleContract.test.ts
git commit -m "style(toc): compact article outline into hover rail"
```

### Task 3: Harden scrolling, prop updates, and browser behavior

**Files:**
- Modify: `src/views/detail/cpns/detail/DetailToc.vue`
- Modify: `src/views/detail/cpns/detail/test/DetailToc.test.ts`

**Interfaces:**
- Consumes: `activeId`, `isDesktopExpanded`, the desktop list element, and dynamic `titles`.
- Produces: active-link auto-reveal, active fallback after title changes, and leak-free passive/global listeners.

- [ ] **Step 1: Add failing edge-case tests**

Add tests equivalent to:

```ts
it('falls back to the first heading when titles replace the active heading', async () => {
  const wrapper = mountDetailToc();
  await wrapper.setProps({ titles: [{ id: 'replacement', title: 'Replacement', level: 1 }] });
  expect(wrapper.get('.toc-link').attributes('aria-current')).toBe('location');
});

it('removes document and window listeners on unmount', () => {
  const removeDocument = vi.spyOn(document, 'removeEventListener');
  const removeWindow = vi.spyOn(window, 'removeEventListener');
  const wrapper = mountDetailToc();
  wrapper.unmount();
  expect(removeDocument).toHaveBeenCalledWith('pointerdown', expect.any(Function));
  expect(removeWindow).toHaveBeenCalledWith('keydown', expect.any(Function));
});
```

Also assert that an active anchor calls `scrollIntoView({ block: 'nearest' })` when the expanded panel is open.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/DetailToc.test.ts
```

Expected: new title replacement or active-link reveal assertions FAIL.

- [ ] **Step 3: Implement watchers and cleanup**

Watch `props.titles` and reset `activeId` only when the current id no longer exists. Watch `[activeId, isDesktopExpanded]`, await `nextTick`, and call `scrollIntoView({ block: 'nearest' })` only while expanded. Use `{ passive: true }` for the page scroll listener and remove every listener during unmount.

- [ ] **Step 4: Run targeted and full verification**

Run:

```bash
pnpm exec vitest run \
  src/views/detail/cpns/detail/test/DetailToc.test.ts \
  src/views/detail/cpns/detail/test/TocStyleContract.test.ts
pnpm exec vue-tsc --noEmit
pnpm exec vitest run
pnpm run build-only
```

Expected: targeted tests, full test suite, type-check, and production build all exit with code 0.

- [ ] **Step 5: Verify in a real browser**

Start the existing Vite app and inspect an article containing many long headings at desktop and mobile widths. Confirm:

- Collapsed rail is the only default desktop footprint.
- Hover/focus expansion and click pinning work.
- Outside click and Escape close immediately.
- Long inactive headings remain one line; active heading uses at most two lines.
- The panel never exceeds `min(60vh, 520px)`.
- Light/dark themes remain legible.
- At `992px`, the rail is hidden and the existing Drawer trigger is shown.

- [ ] **Step 6: Commit the hardened final slice**

```bash
git add src/views/detail/cpns/detail/DetailToc.vue src/views/detail/cpns/detail/test/DetailToc.test.ts
git commit -m "test(toc): harden article outline behavior"
```
