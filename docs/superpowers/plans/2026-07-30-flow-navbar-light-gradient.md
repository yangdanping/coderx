# Flow Navbar Light Gradient Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the navbar `Flow` label's previous light-mode gradient without changing its dark-mode appearance or the Home role `X` gradients.

**Architecture:** Introduce a dedicated global CSS custom property for the navbar label and consume it from `NavMenu.vue`. Protect the separation with a source-contract test that locks both the historical gradient value and the component's semantic token reference.

**Tech Stack:** Vue 3.5 SFC, scoped SCSS, CSS custom properties, Vitest 4, pnpm.

## Global Constraints

- The restored gradient is exactly `linear-gradient(135deg, rgba(143, 235, 135, 0.7) 30%, rgba(56, 72, 249, 0.7) 100%)`.
- Dark mode must keep the same rendered `Flow` gradient it has before this change.
- Do not change `Flow` typography, spacing, hover behavior, active underline, page content, or routing.
- Do not revert or otherwise alter the Home role `X` light-mode gradients.
- Do not modify unrelated pre-existing working-tree changes.

---

### Task 1: Decouple the Flow Navbar Gradient

**Files:**
- Modify: `src/components/navbar/cpns/test/NavMenu.test.ts`
- Modify: `src/assets/css/common.scss`
- Modify: `src/components/navbar/cpns/NavMenu.vue`

**Interfaces:**
- Consumes: the global `:root` custom-property scope from `src/assets/css/common.scss`.
- Produces: `--flow-nav-gradient`, consumed only by `.special-flow` in `NavMenu.vue`.

- [ ] **Step 1: Write the failing style-contract test**

Add this test inside the existing `describe('NavMenu', ...)` block:

```ts
it('keeps the Flow label on its historical gradient independently from the Home X treatment', () => {
  const navMenuSource = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavMenu.vue'), 'utf8');
  const commonStyles = readFileSync(join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');
  const flowBlock = navMenuSource.match(/&\.special-flow\s*{([\s\S]*?)\n\s*}/)?.[1] ?? '';

  expect(commonStyles).toContain(
    '--flow-nav-gradient: linear-gradient(135deg, rgba(143, 235, 135, 0.7) 30%, rgba(56, 72, 249, 0.7) 100%);',
  );
  expect(flowBlock).toContain('background-image: var(--flow-nav-gradient);');
  expect(flowBlock).not.toContain('var(--xfontStyle)');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run src/components/navbar/cpns/test/NavMenu.test.ts
```

Expected: FAIL because `--flow-nav-gradient` is not defined and `.special-flow` still uses `var(--xfontStyle)`.

- [ ] **Step 3: Add the independent theme token**

In the `:root` theme variables in `src/assets/css/common.scss`, immediately after `--xfontStyle`, add:

```scss
  /* 顶栏 Flow 保留原有渐变，不跟随首页角色 X 的主题调色 */
  --flow-nav-gradient: linear-gradient(135deg, rgba(143, 235, 135, 0.7) 30%, rgba(56, 72, 249, 0.7) 100%);
```

Do not add an `html.dark` override: both themes intentionally use this historical value.

- [ ] **Step 4: Point the Flow label at the semantic token**

In `.menu-item.special-flow` in `src/components/navbar/cpns/NavMenu.vue`, replace only the background token:

```scss
        background-image: var(--flow-nav-gradient);
```

Leave all surrounding typography, clipping, hover, responsive, and active styles unchanged.

- [ ] **Step 5: Run focused verification and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/navbar/cpns/test/NavMenu.test.ts
```

Expected: all `NavMenu` tests PASS.

- [ ] **Step 6: Run project verification**

Run:

```bash
pnpm exec eslint src/components/navbar/cpns/NavMenu.vue src/components/navbar/cpns/test/NavMenu.test.ts
pnpm run type-check
pnpm run build
```

Expected: every command exits with code `0`.

- [ ] **Step 7: Review the final diff**

Run:

```bash
git diff --check
git diff -- src/assets/css/common.scss src/components/navbar/cpns/NavMenu.vue src/components/navbar/cpns/test/NavMenu.test.ts
```

Expected: no whitespace errors; the task's source diff contains one token declaration, one token reference replacement, and one regression test, while unrelated pre-existing changes remain untouched.
