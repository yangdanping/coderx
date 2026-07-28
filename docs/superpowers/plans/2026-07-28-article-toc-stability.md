# Article TOC Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate active-switch layout jitter and scrollspy mis-selection while improving TOC text contrast without changing the existing disclosure model.

**Architecture:** Extract page-scroll observation and click-intent arbitration from `DetailToc.vue` into a local `useTocScrollSpy` composable. Keep `DetailToc.vue` responsible for rendering, disclosure state, and its own list container; make active styling layout-neutral and split text/accent/rail color roles.

**Tech Stack:** Vue 3.5 Composition API, TypeScript, SCSS, Vue Test Utils, Vitest, jsdom, Vite browser verification.

## Global Constraints

- Preserve all pre-existing uncommitted user changes in `DetailToc.vue` and its tests.
- Do not modify `package.json`, `pnpm-lock.yaml`, `NavBarActionPanel.vue`, `Home.vue`, the parent detail grid, the heading extractor, or `ArticleTocDemo.vue`.
- Add no third-party dependency.
- Keep the desktop breakpoint, hover/focus/pin/Escape disclosure model, `220px` panel, `min(60vh, 520px)` list cap, and mobile Drawer behavior.
- Use `getBoundingClientRect()` consistently for scrollspy coordinates; never compare `offsetTop` with `window.scrollY`.
- Active and inactive links must have identical layout-affecting styles.
- Respect `prefers-reduced-motion` for page navigation.
- Because the target files were already dirty before this task, do not commit production-code changes unless they can be isolated without staging the user's prior work.

---

## File Map

- Create `src/views/detail/cpns/detail/useTocScrollSpy.ts`: page scroll observation, pending click target, completion and interruption lifecycle.
- Create `src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts`: deterministic state and lifecycle regression tests.
- Modify `src/views/detail/cpns/detail/DetailToc.vue`: consume the composable, constrain active-link reveal to the list shell, and make styles layout-neutral/readable.
- Modify `src/views/detail/cpns/detail/test/DetailToc.test.ts`: component integration, reduced motion, and isolated shell scrolling tests.
- Modify `src/views/detail/cpns/detail/test/TocStyleContract.test.ts`: geometry-neutral active and color-token contracts.

### Task 1: Build the scrollspy state boundary

**Files:**

- Create: `src/views/detail/cpns/detail/useTocScrollSpy.ts`
- Create: `src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts`

**Interfaces:**

- Consumes:

```ts
interface UseTocScrollSpyOptions {
  titles: MaybeRefOrGetter<readonly DetailTocTitle[]>;
  activationOffset?: number;
  navigationOffset?: number;
  scrollIdleMs?: number;
}
```

- Produces:

```ts
interface UseTocScrollSpyResult {
  activeId: ComputedRef<string>;
  observedId: Readonly<ShallowRef<string>>;
  pendingTargetId: Readonly<ShallowRef<string | null>>;
  scrollToHeading: (id: string) => void;
  syncActiveFromScroll: () => void;
}
```

- [ ] **Step 1: Write failing coordinate and pending-target tests**

Create a mounted composable harness and real jsdom heading elements whose `getBoundingClientRect()` values are controlled independently from deliberately misleading `offsetTop` values:

```ts
const positions = new Map<string, number>();

function appendHeading(id: string, viewportTop: number, misleadingOffsetTop = 0) {
  const heading = document.createElement('h2');
  heading.id = id;
  positions.set(id, viewportTop);
  Object.defineProperty(heading, 'offsetTop', { configurable: true, value: misleadingOffsetTop });
  vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        top: positions.get(id) ?? 0,
        bottom: positions.get(id) ?? 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: positions.get(id) ?? 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
  document.body.append(heading);
}
```

Cover these behaviors:

```ts
it('selects headings from viewport coordinates instead of offsetTop', async () => {
  appendHeading('one', -40, 5000);
  appendHeading('two', 260, 10);
  const { result } = mountScrollSpy();
  result.syncActiveFromScroll();
  expect(result.activeId.value).toBe('one');
});

it('keeps the clicked target active while intermediate headings pass the activation line', async () => {
  const { result } = mountScrollSpy();
  result.scrollToHeading('three');
  positions.set('two', 80);
  positions.set('three', 700);
  window.dispatchEvent(new Event('scroll'));
  await nextTick();
  expect(result.observedId.value).toBe('two');
  expect(result.activeId.value).toBe('three');
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts --reporter=verbose
```

Expected: FAIL because `useTocScrollSpy.ts` does not exist.

- [ ] **Step 3: Implement the minimal reactive state and viewport-coordinate sync**

Start `useTocScrollSpy.ts` with:

```ts
import { computed, onMounted, onUnmounted, readonly, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';

import type { DetailTocTitle } from './types/detail-toc.type';

const DEFAULT_ACTIVATION_OFFSET = 120;
const DEFAULT_NAVIGATION_OFFSET = 100;
const DEFAULT_SCROLL_IDLE_MS = 140;

export function useTocScrollSpy({
  titles,
  activationOffset = DEFAULT_ACTIVATION_OFFSET,
  navigationOffset = DEFAULT_NAVIGATION_OFFSET,
  scrollIdleMs = DEFAULT_SCROLL_IDLE_MS,
}: UseTocScrollSpyOptions): UseTocScrollSpyResult {
  const initialId = toValue(titles)[0]?.id ?? '';
  const observedId = shallowRef(initialId);
  const pendingTargetId = shallowRef<string | null>(null);
  const activeId = computed(() => pendingTargetId.value ?? observedId.value);

  const syncActiveFromScroll = () => {
    const items = toValue(titles);
    let nextId = items[0]?.id ?? '';
    const atPageEnd =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;

    if (atPageEnd) {
      nextId = [...items].reverse().find((item) => document.getElementById(item.id))?.id ?? nextId;
    } else {
      for (const item of items) {
        const heading = document.getElementById(item.id);
        if (heading && heading.getBoundingClientRect().top <= activationOffset) {
          nextId = item.id;
        }
      }
    }

    observedId.value = nextId;
  };
```

Then add the rAF-coalesced scroll handler, pending target computed state, and lifecycle cleanup required by the interface. Do not introduce a click-started `900ms` timer.

- [ ] **Step 4: Add failing completion, idle fallback, interruption, reduced-motion, prop replacement, and cleanup tests**

Add focused tests:

```ts
it('clears pending when the target reaches the navigation offset', async () => {
  result.scrollToHeading('three');
  positions.set('three', 100);
  window.dispatchEvent(new Event('scroll'));
  await nextTick();
  expect(result.pendingTargetId.value).toBeNull();
  expect(result.activeId.value).toBe('three');
});

it('finishes from scroll inactivity rather than a click-duration timeout', async () => {
  vi.useFakeTimers();
  result.scrollToHeading('three');
  positions.set('two', 60);
  positions.set('three', 500);
  window.dispatchEvent(new Event('scroll'));
  await vi.advanceTimersByTimeAsync(141);
  expect(result.pendingTargetId.value).toBeNull();
  expect(result.activeId.value).toBe('two');
});

it('cancels pending navigation when the user wheels', () => {
  result.scrollToHeading('three');
  positions.set('two', 60);
  window.dispatchEvent(new WheelEvent('wheel'));
  expect(result.pendingTargetId.value).toBeNull();
  expect(result.activeId.value).toBe('two');
});

it('uses instant scrolling when reduced motion is preferred', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  result.scrollToHeading('two');
  expect(window.scrollTo).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'auto' });
});
```

Also replace the titles array with a new array that reuses `article-header-*` ids and assert pending is cleared and observed state resets to the first title. Spy on listener removal, `cancelAnimationFrame`, and timer cleanup during unmount.

- [ ] **Step 5: Run RED for the lifecycle cases**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts --reporter=verbose
```

Expected: the newly added completion/interruption/lifecycle assertions FAIL while the basic state tests pass.

- [ ] **Step 6: Complete the condition-based lifecycle**

Implement:

```ts
const interruptKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finishPendingNavigation = () => {
  clearScrollIdleTimer();
  syncActiveFromScroll();
  pendingTargetId.value = null;
};

const targetReached = () => {
  const id = pendingTargetId.value;
  if (!id) return false;
  const heading = document.getElementById(id);
  if (!heading) return true;
  const atPageEnd =
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
  return Math.abs(heading.getBoundingClientRect().top - navigationOffset) <= 2 || atPageEnd;
};
```

On each real scroll event:

1. schedule one rAF to update `observedId`;
2. clear pending immediately if `targetReached()`;
3. otherwise reset a `scrollIdleMs` timer that calls `finishPendingNavigation()`.

Register `scrollend` on `document` only when supported. Register `wheel`, `touchstart`, and navigation-key interruption listeners on `window`. Cancel all rAF/timers/listeners on unmount.

- [ ] **Step 7: Run Task 1 GREEN**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts --reporter=verbose
pnpm exec vue-tsc --noEmit
```

Expected: all scrollspy tests PASS and type-check exits `0`.

### Task 2: Integrate scrollspy and isolate internal list scrolling

**Files:**

- Modify: `src/views/detail/cpns/detail/DetailToc.vue`
- Modify: `src/views/detail/cpns/detail/test/DetailToc.test.ts`

**Interfaces:**

- Consumes:

```ts
const { activeId, scrollToHeading } = useTocScrollSpy({
  titles: () => props.titles,
});
```

- Produces:

```ts
function revealActiveLink(shell: HTMLElement, activeLink: HTMLElement, edgePadding?: number): void;
```

- [ ] **Step 1: Replace the obsolete lock test with failing integration tests**

Remove the test that only sends one scroll event while the old lock is true. Add:

```ts
it('does not let a long-distance click settle on the following heading', async () => {
  appendHeading('article-header-0', -120);
  appendHeading('article-header-1', 100);
  appendHeading('article-header-2', 200);
  await wrapper.findAll('.toc-link')[1]?.trigger('click');
  expect(wrapper.find('.toc-link[aria-current="location"]').attributes('href'))
    .toBe('#article-header-1');
});

it('does not scroll either container when the active link is already visible', async () => {
  mockRect(shell, { top: 100, bottom: 500 });
  mockRect(activeLink, { top: 180, bottom: 220 });
  const initialWindowY = window.scrollY;
  const initialShellTop = shell.scrollTop;
  await activateLink();
  expect(shell.scrollTop).toBe(initialShellTop);
  expect(window.scrollY).toBe(initialWindowY);
});

it('reveals an offscreen active link by scrolling only the toc shell', async () => {
  mockRect(shell, { top: 100, bottom: 500 });
  mockRect(activeLink, { top: 520, bottom: 570 });
  shell.scrollTop = 40;
  const initialWindowY = window.scrollY;
  await activateLink();
  expect(shell.scrollTop).toBe(116);
  expect(window.scrollY).toBe(initialWindowY);
});
```

Keep the navbar-offset and mobile Drawer close tests.

- [ ] **Step 2: Run component RED**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/DetailToc.test.ts --reporter=verbose
```

Expected: FAIL because the component still owns `isProgrammaticScroll`, uses the `900ms` timer, and calls `scrollIntoView`.

- [ ] **Step 3: Integrate the composable and delete the competing writers**

In `DetailToc.vue`:

```ts
import { useTocScrollSpy } from './useTocScrollSpy';

const { activeId, scrollToHeading } = useTocScrollSpy({
  titles: () => props.titles,
});

const handleMobileClick = (id: string) => {
  scrollToHeading(id);
  showDrawer.value = false;
};
```

Update desktop click binding to `@click.prevent="scrollToHeading(item.id)"`.

Delete:

- local writable `activeId`;
- `isProgrammaticScroll`;
- `programmaticScrollEndTimer`;
- `programmaticScrollEndHandler`;
- `syncActiveFromScroll`;
- `beginProgrammaticScroll`;
- `finishProgrammaticScroll`;
- local `handleScroll`;
- the titles watcher that directly writes `activeId`;
- scroll listener registration/removal from the component.

- [ ] **Step 4: Replace `scrollIntoView` with shell-only nearest-edge math**

Keep the existing `[activeId, isDesktopExpanded]` watch, but replace its body after `nextTick()` with:

```ts
const edgePadding = 6;
const shellRect = shell.getBoundingClientRect();
const linkRect = activeLink.getBoundingClientRect();
let nextScrollTop = shell.scrollTop;

if (linkRect.top < shellRect.top + edgePadding) {
  nextScrollTop -= shellRect.top + edgePadding - linkRect.top;
} else if (linkRect.bottom > shellRect.bottom - edgePadding) {
  nextScrollTop += linkRect.bottom - (shellRect.bottom - edgePadding);
}

shell.scrollTop = Math.max(0, nextScrollTop);
```

This code must never call `scrollIntoView()` and must not write `window.scrollY`.

- [ ] **Step 5: Run Task 2 GREEN**

Run:

```bash
pnpm exec vitest run \
  src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts \
  src/views/detail/cpns/detail/test/DetailToc.test.ts \
  --reporter=verbose
```

Expected: both files PASS.

### Task 3: Freeze active geometry and split semantic colors

**Files:**

- Modify: `src/views/detail/cpns/detail/DetailToc.vue`
- Modify: `src/views/detail/cpns/detail/test/TocStyleContract.test.ts`

**Interfaces:**

- Produces these desktop tokens:

```scss
--toc-text-muted: #686868;
--toc-accent-text: #347a4e;
--toc-accent-decorative: #81c995;
--toc-rail-color: color-mix(in srgb, var(--text-secondary) 78%, var(--text-primary));
```

- [ ] **Step 1: Write a failing layout-neutral style contract**

Extract the `.toc-item.active .toc-link` declaration block and assert:

```ts
expect(activeLinkRule).toContain('color: var(--toc-accent-text)');
expect(activeLinkRule).not.toMatch(
  /\b(?:padding|margin|font-size|font-weight|line-height|display|white-space)\s*:/,
);
expect(tocLinkRule).not.toMatch(/font-weight\s+0\.18s/);
expect(detailSource).toContain('--toc-text-muted: #686868;');
expect(detailSource).toContain('--toc-accent-text: #347a4e;');
expect(detailSource).toContain('--toc-accent-decorative: #81c995;');
```

Also assert that the base/level padding reserves marker space and that `.toc-item::before` exists in every item with inactive opacity.

- [ ] **Step 2: Run style RED**

Run:

```bash
pnpm exec vitest run src/views/detail/cpns/detail/test/TocStyleContract.test.ts --reporter=verbose
```

Expected: FAIL because active still changes padding and font weight and still uses one color token for text and decoration.

- [ ] **Step 3: Implement metric-stable styles**

Use:

```scss
.toc-desktop {
  --toc-text-muted: #686868;
  --toc-accent-text: #347a4e;
  --toc-accent-decorative: #81c995;
  --toc-rail-color: color-mix(in srgb, var(--text-secondary) 78%, var(--text-primary));
}

.toc-item {
  color: var(--toc-text-muted);

  &.level-1 .toc-link {
    padding-left: 14px;
    font-size: 14px;
    font-weight: 560;
  }

  &.level-2 .toc-link {
    padding-left: 18px;
  }
}

.toc-link {
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.toc-item::before {
  opacity: 0;
  transform: translateY(-50%) scale(0.6);
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.toc-item.active::before {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.toc-item.active .toc-link {
  color: var(--toc-accent-text);
}
```

Use `--toc-accent-decorative` for the rail active tick and bullet. Use `--toc-rail-color` for the rail control. Use `--toc-accent-text` for focus outlines that must remain visible. Preserve dark-mode contrast by setting both dark accent tokens to `#c0e0c7`.

- [ ] **Step 4: Run Task 3 GREEN and focused regression**

Run:

```bash
pnpm exec vitest run \
  src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts \
  src/views/detail/cpns/detail/test/DetailToc.test.ts \
  src/views/detail/cpns/detail/test/TocStyleContract.test.ts \
  --reporter=verbose
```

Expected: all TOC tests PASS.

### Task 4: Full verification and browser measurement

**Files:**

- Verify only; modify the preceding files only if a new failing regression requires it.

- [ ] **Step 1: Run static and full automated checks**

Run:

```bash
pnpm exec vue-tsc --noEmit
pnpm exec vitest run
pnpm run build-only
git diff --check
```

Expected: every command exits `0`; Vitest reports zero failed files/tests.

- [ ] **Step 2: Measure the original reproduction in the real browser**

Start Vite and open `/article/143`. Pin the TOC and switch repeatedly between:

- `Prerequisites`
- `Run your first inference with the Responses API`

Collect, before click and through at least `250ms` after click:

```js
Array.from(document.querySelectorAll('.toc-link')).map((link) => {
  const rect = link.getBoundingClientRect();
  return { href: link.getAttribute('href'), top: rect.top, height: rect.height };
});
```

Expected:

- the clicked and previously active link keep the same `height`;
- every following link keeps the same `top`;
- no `18px` transient movement occurs;
- text changes color and bullets crossfade without horizontal text movement.

- [ ] **Step 3: Verify long-distance selection and scroll isolation**

Click `Get started with GPT-5.6 on Amazon Bedrock`, wait until page scrolling fully stops, and confirm `aria-current` remains `#article-header-3`.

Scroll the article until the active item exits the TOC shell:

- `.toc-list-shell.scrollTop` may change;
- `window.scrollY` must not receive an extra jump from TOC auto-reveal.

- [ ] **Step 4: Verify accessibility variants**

Check:

- light mode inactive `#686868` and active `#347a4e`;
- dark mode remains legible;
- keyboard focus, Escape, lock/unlock, and real anchor semantics remain functional;
- with reduced motion enabled, link navigation uses `behavior: 'auto'`;
- at the mobile breakpoint, selection still closes the Drawer.

- [ ] **Step 5: Review the final diff against ownership**

Run:

```bash
git status --short
git diff -- \
  src/views/detail/cpns/detail/DetailToc.vue \
  src/views/detail/cpns/detail/useTocScrollSpy.ts \
  src/views/detail/cpns/detail/test/useTocScrollSpy.test.ts \
  src/views/detail/cpns/detail/test/DetailToc.test.ts \
  src/views/detail/cpns/detail/test/TocStyleContract.test.ts
```

Expected: only TOC-related changes are present, while all pre-existing non-TOC working-tree changes remain untouched.
