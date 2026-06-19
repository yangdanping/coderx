# Home Explore Sticky Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible, responsive sticky-note link beneath the homepage hero title that routes new visitors to the article column.

**Architecture:** Introduce one focused Vue component for the semantic router link and all paper/curl/shadow presentation. Keep `Home.vue` responsible only for placement inside the existing title block so its current mesh background, scramble title, and shader behavior remain intact.

**Tech Stack:** Vue 3 SFC with `<script setup lang="ts">`, Vue Router, scoped SCSS, Vitest, Vue Test Utils.

---

## File Structure

- Create `src/views/home/cpns/HomeExploreLink.vue`: semantic CTA markup plus all sticky-note, curved-curl, ASCII-shadow, interaction, theme, and responsive styles.
- Create `src/views/home/cpns/test/HomeExploreLink.test.ts`: component contract tests for label, route destination, decorative accessibility, and CSS interaction/responsive requirements.
- Modify `src/views/home/Home.vue`: import and place the CTA beneath the existing scramble title; only add layout spacing/alignment needed by the new component.

### Task 1: Build the accessible sticky-note link

**Files:**
- Create: `src/views/home/cpns/test/HomeExploreLink.test.ts`
- Create: `src/views/home/cpns/HomeExploreLink.vue`

- [ ] **Step 1: Write the failing component contract test**

```ts
import { mount, RouterLinkStub } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import HomeExploreLink from '../HomeExploreLink.vue';

describe('HomeExploreLink', () => {
  function mountLink() {
    return mount(HomeExploreLink, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
  }

  it('links new visitors to the article column', () => {
    const wrapper = mountLink();
    const link = wrapper.getComponent(RouterLinkStub);

    expect(link.props('to')).toEqual({ name: 'article' });
    expect(link.text()).toContain('Start Exploring');
  });

  it('keeps visual effects decorative', () => {
    const wrapper = mountLink();

    expect(wrapper.get('.home-explore-link__ascii-shadow').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.home-explore-link__curl').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.home-explore-link__contact-shadow').attributes('aria-hidden')).toBe('true');
  });

  it('defines focus, reduced-motion, touch, and dark-mode treatments', async () => {
    const source = await import('../HomeExploreLink.vue?raw');

    expect(source.default).toContain(':focus-visible');
    expect(source.default).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source.default).toContain('@media (hover: none)');
    expect(source.default).toContain(':where(html.dark)');
  });
});
```

- [ ] **Step 2: Run the test and verify the missing component failure**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: FAIL because `HomeExploreLink.vue` does not exist.

- [ ] **Step 3: Implement the minimal semantic component**

Create `HomeExploreLink.vue` with:

```vue
<template>
  <div class="home-explore-link">
    <span class="home-explore-link__ascii-shadow" aria-hidden="true">
      ░░░▒▒▒▓▓▓▓▓
      <span>░░▒▒▒▓▓▓▓▓▓</span>
    </span>
    <RouterLink class="home-explore-link__note" :to="{ name: 'article' }">
      <span class="home-explore-link__label">Start Exploring</span>
      <span class="home-explore-link__contact-shadow" aria-hidden="true"></span>
      <span class="home-explore-link__curl" aria-hidden="true"></span>
    </RouterLink>
  </div>
</template>
```

Implement scoped SCSS based on the approved high-fidelity preview:

- compact 196–220 px warm yellow paper;
- subtle line texture and tonal gradient;
- curved bottom-right cutout and separate curled paper layer;
- two-line ASCII shadow;
- `transform`/`opacity` hover and focus motion;
- visible offset focus ring;
- active press state;
- dark-mode color adjustments through `:where(html.dark)`;
- slightly open curl under `@media (hover: none)`;
- transitions removed under `prefers-reduced-motion`.

- [ ] **Step 4: Run the component test and verify it passes**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the component**

```bash
git add src/views/home/cpns/HomeExploreLink.vue src/views/home/cpns/test/HomeExploreLink.test.ts
git commit -m "feat(home): add explore sticky note link"
```

### Task 2: Place the CTA in the existing homepage hero

**Files:**
- Modify: `src/views/home/test/Home.scramble.test.ts`
- Modify: `src/views/home/Home.vue`

- [ ] **Step 1: Add a failing homepage placement test**

Add to `Home.scramble.test.ts`:

```ts
it('places the article discovery link inside the hero title block', () => {
  const wrapper = mountHome();
  const title = wrapper.get('.title');
  const exploreLink = title.getComponent({ name: 'HomeExploreLink' });

  expect(exploreLink.exists()).toBe(true);
  expect(wrapper.get('.title-section').findComponent({ name: 'HomeExploreLink' }).exists()).toBe(true);
});
```

Stub/import behavior should follow the current shallow-mount setup.

- [ ] **Step 2: Run the homepage test and verify the placement failure**

Run:

```bash
pnpm vitest run src/views/home/test/Home.scramble.test.ts
```

Expected: FAIL because `Home.vue` has not rendered `HomeExploreLink`.

- [ ] **Step 3: Add the component to the title block**

Modify the title markup:

```vue
<div class="title">
  <div class="title-line-1">Welcome to</div>
  <div class="title-line-2">
    <ScrambleFrameText class="title-word" :frame="frame" :target="target" />
  </div>
  <HomeExploreLink class="title-explore-link" />
</div>
```

Import `HomeExploreLink` from `./cpns/HomeExploreLink.vue`.

Add only placement rules to `Home.vue`:

```scss
.title-explore-link {
  margin-top: clamp(26px, 3vw, 42px);
}
```

At the existing `max-width: 1040px` stacked breakpoint, keep the title centered so the component follows the existing alignment. At the mobile breakpoint, ensure no fixed width causes overflow at 320 px.

- [ ] **Step 4: Run both focused test files**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts src/views/home/test/Home.scramble.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit homepage placement**

```bash
git add src/views/home/Home.vue src/views/home/test/Home.scramble.test.ts
git commit -m "feat(home): place explore link in hero"
```

### Task 3: Verify visual, responsive, and interface quality

**Files:**
- Modify if required by findings:
  - `src/views/home/cpns/HomeExploreLink.vue`
  - `src/views/home/Home.vue`
  - `src/views/home/cpns/test/HomeExploreLink.test.ts`

- [ ] **Step 1: Run static verification**

Run:

```bash
pnpm type-check
pnpm eslint src/views/home/Home.vue src/views/home/cpns/HomeExploreLink.vue src/views/home/test/Home.scramble.test.ts src/views/home/cpns/test/HomeExploreLink.test.ts
pnpm build-only
```

Expected: all commands exit successfully.

- [ ] **Step 6: Commit verification-driven refinements**

If verification changed tracked files:

```bash
git add src/views/home/Home.vue src/views/home/cpns/HomeExploreLink.vue src/views/home/test/Home.scramble.test.ts src/views/home/cpns/test/HomeExploreLink.test.ts
git commit -m "fix(home): refine explore link interactions"
```

- [ ] **Step 2: Run the homepage locally and inspect desktop behavior**

Run:

```bash
pnpm dev
```

Verify:

- CTA is below the title and does not overlap the shader.
- Curved bottom-right curl reads as paper, not a circular badge.
- Hover lifts the paper and enlarges the curl without layout shift.
- ASCII shadow remains restrained and visually attached to the paper.
- Link navigates to `/article`.
- Focus ring is clearly visible using keyboard navigation.
- Dark mode preserves contrast.

- [ ] **Step 3: Inspect mobile and reduced-motion behavior**

Verify at widths 390 px and 320 px:

- CTA centers with the stacked title.
- No horizontal overflow.
- Touch target is at least 44 px tall.
- Curl is visible without hover.
- Active feedback is present.

Emulate `prefers-reduced-motion: reduce` and confirm state changes remain visible without animated transitions.

- [ ] **Step 4: Fetch and apply the latest Web Interface Guidelines**

Fetch:

```text
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Review the changed UI files using the required terse `file:line` output. Fix actionable accessibility, interaction, responsive, and performance findings, then repeat focused tests and static verification.

- [ ] **Step 5: Final regression run**

Run:

```bash
pnpm vitest run src/views/home/cpns/test/HomeExploreLink.test.ts src/views/home/test/Home.scramble.test.ts
pnpm type-check
pnpm build-only
```

Expected: all commands exit successfully.
