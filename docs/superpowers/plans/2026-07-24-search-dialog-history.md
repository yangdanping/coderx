# Search Dialog History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact, theme-aware search dialog with typed local search/favorite history, loading/search icon switching, and keyboard-first article navigation.

**Architecture:** `LocalCache` owns validation, migration, deduplication, limits, and the two storage keys. `NavBarSearch.vue` owns transient dialog/search/selection state and routes all mouse and keyboard activation through the same navigation functions. Existing Vue Query search, focus trapping, modal cleanup, and navbar shortcut behavior remain in place.

**Tech Stack:** Vue 3.5 `<script setup>`, TypeScript 6, Vue Router, TanStack Vue Query, Lucide Vue icons, SCSS, Vitest, Vue Test Utils.

## Global Constraints

- Persist normal history under `coderx_search_history_v2`.
- Persist favorites under `coderx_favorite_search_history`.
- Store at most 20 items per list.
- Do not implement business-specific result subtitles or Algolia branding.
- Pressing Enter opens the highlighted article when one exists; otherwise it navigates to `/search?q=<keyword>`.
- Clicking keyword history only restores the input; clicking linked article history navigates to the article.
- Deleting normal history must not delete the corresponding favorite.
- Preserve `Command/Ctrl + K`, Escape, modal focus management, mobile safe areas, and reduced-motion behavior.
- Do not add a global store or a new runtime dependency.

---

### Task 1: Typed search-history persistence

**Files:**
- Modify: `src/utils/LocalCache.ts`
- Create: `src/utils/test/LocalCache.test.ts`

**Interfaces:**
- Produces: `SearchHistoryItem { id: string; value: string; articleId?: string | number }`
- Produces: `SEARCH_HISTORY_STORAGE_KEY`, `FAVORITE_SEARCH_HISTORY_STORAGE_KEY`
- Produces: `LocalCache.getSearchHistory(): SearchHistoryItem[]`
- Produces: `LocalCache.addSearchHistory(input: SearchHistoryInput): SearchHistoryItem[]`
- Produces: `LocalCache.removeSearchHistory(id: string): SearchHistoryItem[]`
- Produces: `LocalCache.clearSearchHistory(): void`
- Produces: `LocalCache.getFavoriteSearchHistory(): SearchHistoryItem[]`
- Produces: `LocalCache.toggleFavoriteSearchHistory(input: SearchHistoryInput): SearchHistoryItem[]`
- Produces: `LocalCache.isFavoriteSearchHistory(input: SearchHistoryInput): boolean`

- [ ] **Step 1: Write failing persistence tests**

Create `src/utils/test/LocalCache.test.ts` with isolated in-memory storage and assertions for migration, key isolation, invalid JSON, stable deduplication, limits, and non-cascading deletion:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import LocalCache, {
  FAVORITE_SEARCH_HISTORY_STORAGE_KEY,
  SEARCH_HISTORY_STORAGE_KEY,
} from '../LocalCache';

describe('LocalCache search history', () => {
  beforeEach(() => localStorage.clear());

  it('migrates legacy keyword strings into typed v2 history', () => {
    localStorage.setItem('coderx_search_history', JSON.stringify([' Vue ', 'TypeScript']));

    expect(LocalCache.getSearchHistory()).toEqual([
      { id: 'query:vue', value: 'Vue' },
      { id: 'query:typescript', value: 'TypeScript' },
    ]);
    expect(localStorage.getItem('coderx_search_history')).toBeNull();
    expect(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).not.toBeNull();
  });

  it('keeps normal and favorite history isolated', () => {
    const article = { value: 'Vue Query', articleId: 21 };
    LocalCache.addSearchHistory(article);
    LocalCache.toggleFavoriteSearchHistory(article);
    LocalCache.removeSearchHistory('article:21');

    expect(LocalCache.getSearchHistory()).toEqual([]);
    expect(LocalCache.getFavoriteSearchHistory()).toEqual([
      { id: 'article:21', value: 'Vue Query', articleId: 21 },
    ]);
    expect(localStorage.getItem(FAVORITE_SEARCH_HISTORY_STORAGE_KEY)).not.toBeNull();
  });

  it('recovers from malformed storage and deduplicates recent items', () => {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, '{broken');
    expect(LocalCache.getSearchHistory()).toEqual([]);

    LocalCache.addSearchHistory('Vue');
    LocalCache.addSearchHistory(' vue ');
    expect(LocalCache.getSearchHistory()).toEqual([{ id: 'query:vue', value: 'vue' }]);
  });

  it('limits each list to twenty items and toggles favorites', () => {
    for (let index = 0; index < 22; index += 1) {
      LocalCache.addSearchHistory(`query ${index}`);
    }
    expect(LocalCache.getSearchHistory()).toHaveLength(20);

    LocalCache.toggleFavoriteSearchHistory('Vue');
    expect(LocalCache.isFavoriteSearchHistory('vue')).toBe(true);
    LocalCache.toggleFavoriteSearchHistory('Vue');
    expect(LocalCache.isFavoriteSearchHistory('vue')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the persistence test and confirm RED**

Run:

```bash
pnpm vitest run src/utils/test/LocalCache.test.ts
```

Expected: FAIL because the new constants, types, favorite methods, and typed return values do not exist.

- [ ] **Step 3: Implement typed persistence and migration**

In `src/utils/LocalCache.ts`, add exported constants and types, then replace the string-only search helpers with guarded typed helpers:

```ts
export const SEARCH_HISTORY_STORAGE_KEY = 'coderx_search_history_v2';
export const FAVORITE_SEARCH_HISTORY_STORAGE_KEY = 'coderx_favorite_search_history';
const LEGACY_SEARCH_HISTORY_STORAGE_KEY = 'coderx_search_history';
const SEARCH_HISTORY_LIMIT = 20;

export interface SearchHistoryItem {
  id: string;
  value: string;
  articleId?: string | number;
}

export type SearchHistoryInput = string | Pick<SearchHistoryItem, 'value' | 'articleId'>;

const toSearchHistoryItem = (input: SearchHistoryInput): SearchHistoryItem | null => {
  const value = (typeof input === 'string' ? input : input.value).trim();
  if (!value) return null;
  const articleId = typeof input === 'string' ? undefined : input.articleId;
  if (typeof articleId === 'number' || (typeof articleId === 'string' && articleId.length > 0)) {
    return { id: `article:${articleId}`, value, articleId };
  }
  return { id: `query:${value.toLocaleLowerCase()}`, value };
};

const parseSearchHistory = (raw: string | null): SearchHistoryItem[] | null => {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object' || !('value' in item)) return null;
        const candidate = item as { value?: unknown; articleId?: unknown };
        if (typeof candidate.value !== 'string') return null;
        if (candidate.articleId !== undefined && typeof candidate.articleId !== 'string' && typeof candidate.articleId !== 'number') return null;
        return toSearchHistoryItem({ value: candidate.value, articleId: candidate.articleId });
      })
      .filter((item): item is SearchHistoryItem => item !== null);
  } catch {
    return [];
  }
};
```

Add private class helpers to read, migrate, save, and update lists. `addSearchHistory` removes an existing stable ID before unshifting, `toggleFavoriteSearchHistory` removes an existing favorite or unshifts a new one, and both slice to `SEARCH_HISTORY_LIMIT`.

- [ ] **Step 4: Run the persistence tests and confirm GREEN**

Run:

```bash
pnpm vitest run src/utils/test/LocalCache.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit typed persistence**

```bash
git add src/utils/LocalCache.ts src/utils/test/LocalCache.test.ts
git commit -m "feat(search): add typed local search history"
```

---

### Task 2: Search dialog behavior and keyboard navigation

**Files:**
- Modify: `src/components/navbar/cpns/NavBarSearch.vue`
- Modify: `src/components/navbar/cpns/test/NavBarSearch.test.ts`

**Interfaces:**
- Consumes: Task 1 `SearchHistoryItem` and `LocalCache` methods.
- Produces: shared `activateSearchResult`, `activateHistoryItem`, `toggleFavorite`, `moveResultSelection`, and `handleSearchEnter` behavior.

- [ ] **Step 1: Add failing interaction tests**

Extend `NavBarSearch.test.ts` with tests that seed the v2 keys and exercise the public DOM:

```ts
it('restores keyword history to the input without navigating', async () => {
  window.localStorage.setItem(
    'coderx_search_history_v2',
    JSON.stringify([{ id: 'query:vue', value: 'Vue' }]),
  );
  const wrapper = await mountSearch();
  await wrapper.get('.search-trigger').trigger('click');
  await wrapper.get('.history-item').trigger('click');

  expect(wrapper.get<HTMLInputElement>('.search-input').element.value).toBe('Vue');
  expect(wrapper.vm.$route.path).toBe('/');
});

it('opens linked history and keeps its favorite after normal-history deletion', async () => {
  const article = { id: 'article:21', value: 'Vue Query', articleId: 21 };
  window.localStorage.setItem('coderx_search_history_v2', JSON.stringify([article]));
  window.localStorage.setItem('coderx_favorite_search_history', JSON.stringify([article]));
  const wrapper = await mountSearch();
  await wrapper.get('.search-trigger').trigger('click');
  await wrapper.get('.history-delete').trigger('click');

  expect(wrapper.find('.search-history-section').exists()).toBe(false);
  expect(wrapper.get('.favorite-history-section').text()).toContain('Vue Query');
});

it('uses arrow keys and Enter to open the highlighted article', async () => {
  vi.mocked(search).mockResolvedValue({
    data: [
      { id: 21, title: 'Vue basics' },
      { id: 22, title: 'Vue Query' },
    ],
  } as never);
  const wrapper = await mountSearch();
  await wrapper.get('.search-trigger').trigger('click');
  await wrapper.get('.search-input').setValue('vue');
  await flushPromises();
  await wrapper.get('.search-input').trigger('keydown', { key: 'ArrowDown' });
  await wrapper.get('.search-input').trigger('keydown', { key: 'Enter' });
  await flushPromises();

  expect(wrapper.vm.$route.path).toBe('/article/22');
  expect(LocalCache.getSearchHistory()[0]).toMatchObject({
    id: 'article:22',
    value: 'Vue Query',
  });
});

it('falls back to the full search page when no article is highlighted', async () => {
  vi.mocked(search).mockResolvedValue({ data: [] } as never);
  const wrapper = await mountSearch();
  await wrapper.get('.search-trigger').trigger('click');
  await wrapper.get('.search-input').setValue('TypeScript');
  await flushPromises();
  await wrapper.get('.search-input').trigger('keydown', { key: 'Enter' });
  await flushPromises();

  expect(wrapper.vm.$route.fullPath).toBe('/search?q=TypeScript');
});
```

Import `LocalCache` into the test file and adapt route access through the router returned by the mount helper if Vue wrapper proxy route access is unavailable.

- [ ] **Step 2: Run focused component tests and confirm RED**

Run:

```bash
pnpm vitest run src/components/navbar/cpns/test/NavBarSearch.test.ts
```

Expected: new tests fail because history is still string-based and there is no selection/favorite behavior.

- [ ] **Step 3: Implement shared activation and selection state**

In `NavBarSearch.vue`:

```ts
import { History, LoaderCircle, Search, Star, X } from '@lucide/vue';
import LocalCache, { type SearchHistoryItem } from '@/utils/LocalCache';

const searchHistory = shallowRef<SearchHistoryItem[]>([]);
const favoriteSearchHistory = shallowRef<SearchHistoryItem[]>([]);
const activeResultIndex = shallowRef(-1);

const loadSearchHistory = () => {
  searchHistory.value = LocalCache.getSearchHistory();
  favoriteSearchHistory.value = LocalCache.getFavoriteSearchHistory();
};

watch(searchResults, (results) => {
  activeResultIndex.value = results.length ? 0 : -1;
});

const moveResultSelection = (direction: 1 | -1) => {
  if (!searchResults.value.length) return;
  activeResultIndex.value =
    (activeResultIndex.value + direction + searchResults.value.length) %
    searchResults.value.length;
};

const activateSearchResult = async (item: SearchResultItem) => {
  LocalCache.addSearchHistory({ value: item.title, articleId: item.id });
  loadSearchHistory();
  closeDialog();
  await router.push({ name: 'detail', params: { articleId: item.id } });
};

const activateHistoryItem = async (item: SearchHistoryItem) => {
  if (item.articleId !== undefined) {
    closeDialog();
    await router.push({ name: 'detail', params: { articleId: item.articleId } });
    return;
  }
  searchValue.value = item.value;
  await nextTick();
  searchInput.value?.focus();
};

const handleSearchEnter = () => {
  if (isComposing.value) return;
  const selected = searchResults.value[activeResultIndex.value];
  if (selected) {
    void activateSearchResult(selected);
    return;
  }
  submitSearch();
};
```

Replace history deletion with stable-ID deletion. Add `toggleFavorite(item)`, `isFavorite(item)`, and separate clear-normal-history behavior using the Task 1 API.

- [ ] **Step 4: Run focused component tests and confirm GREEN**

Run:

```bash
pnpm vitest run src/components/navbar/cpns/test/NavBarSearch.test.ts
```

Expected: all existing and new component interaction tests pass.

- [ ] **Step 5: Commit behavior**

```bash
git add src/components/navbar/cpns/NavBarSearch.vue src/components/navbar/cpns/test/NavBarSearch.test.ts
git commit -m "feat(search): add history favorites and keyboard navigation"
```

---

### Task 3: Compact command-panel rendering and theme styles

**Files:**
- Modify: `src/components/navbar/cpns/NavBarSearch.vue`
- Modify: `src/components/navbar/cpns/test/NavBarSearch.test.ts`

**Interfaces:**
- Consumes: Task 2 state and handlers.
- Produces: `.search-loading-icon`, `.search-input-clear`, `.search-result-option`, `.search-history-section`, `.favorite-history-section`, `.search-footer`.

- [ ] **Step 1: Add failing DOM and style-contract tests**

Add assertions for icon switching, absence of subtitles/branding, both sections, selected option semantics, theme variables, and compact dimensions:

```ts
it('switches between search and loading icons while querying', async () => {
  let resolveSearch!: (value: unknown) => void;
  vi.mocked(search).mockReturnValue(new Promise((resolve) => (resolveSearch = resolve)) as never);
  const wrapper = await mountSearch();
  await wrapper.get('.search-trigger').trigger('click');
  await wrapper.get('.search-input').setValue('vue');
  await flushPromises();

  expect(wrapper.find('.search-loading-icon').exists()).toBe(true);
  resolveSearch({ data: [] });
  await flushPromises();
  expect(wrapper.find('.search-loading-icon').exists()).toBe(false);
  expect(wrapper.find('.search-input-icon').exists()).toBe(true);
});

it('renders compact theme-aware panel styles and no provider branding', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'),
    'utf8',
  );
  const dialogStyles = source.match(/\.search-dialog\s*{([\s\S]*?)\n}/)?.[1] ?? '';

  expect(dialogStyles).toMatch(/width:\s*min\(640px,\s*100%\)/);
  expect(dialogStyles).toMatch(/max-height:\s*min\(70d?vh,\s*560px\)/);
  expect(dialogStyles).toContain('var(--glass-bg-popup)');
  expect(source).toContain('color-mix(');
  expect(source).not.toContain('algolia');
  expect(source).not.toContain('组合式 API');
});
```

- [ ] **Step 2: Run focused component tests and confirm RED**

Run:

```bash
pnpm vitest run src/components/navbar/cpns/test/NavBarSearch.test.ts
```

Expected: icon and style-contract tests fail against the previous chip layout.

- [ ] **Step 3: Replace template with compact list sections**

Render the input leading icon with:

```vue
<LoaderCircle
  v-if="isLoading && normalizedDebouncedSearchValue"
  class="search-loading-icon"
  :size="22"
  aria-hidden="true"
/>
<Search v-else class="search-input-icon" :size="22" aria-hidden="true" />
```

Render each search result as a button with `role="option"`, `:aria-selected`, active class, `@mouseenter` selection, and `@click="activateSearchResult(item)"`. Render normal and favorite history as separate sections using `History`, `Star`, and `X` buttons. Do not render a subtitle below result or history titles. Add the keyboard footer without provider text.

- [ ] **Step 4: Implement compact responsive styles**

Set desktop dialog width to `min(640px, 100%)`, max height to `min(70dvh, 560px)`, and use content-driven panel height. Reduce overlay opacity/blur. Style rows with current theme variables, `color-mix()`, focus-visible outlines, and a primary-color active state. On mobile, use `calc(100vw - 24px)`, `max-height: calc(100dvh - 24px)`, 12px outer padding, rounded corners, and safe-area-aware input/footer padding instead of full-screen sizing.

Add a `@keyframes search-spin` animation for `LoaderCircle` and disable it under `prefers-reduced-motion`.

- [ ] **Step 5: Run focused tests and type check**

Run:

```bash
pnpm vitest run src/components/navbar/cpns/test/NavBarSearch.test.ts
pnpm type-check
```

Expected: all component tests pass and `vue-tsc` exits with code 0.

- [ ] **Step 6: Commit visual refactor**

```bash
git add src/components/navbar/cpns/NavBarSearch.vue src/components/navbar/cpns/test/NavBarSearch.test.ts
git commit -m "style(search): compact the search command panel"
```

---

### Task 4: Full verification and main-only branch consolidation

**Files:**
- Verify: all files changed in Tasks 1–3
- Preserve: `docs/superpowers/specs/2026-07-18-global-3d-initial-orientation-design.md`
- Remove after verification: linked worktree `.worktrees/background-triangle-3d`

**Interfaces:**
- Consumes: completed search implementation and clean task branch.
- Produces: local `main` containing all current search work and the history of the superseded background branch, with no other local branches.

- [ ] **Step 1: Run targeted tests**

```bash
pnpm vitest run src/utils/test/LocalCache.test.ts src/components/navbar/cpns/test/NavBarSearch.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run project verification**

```bash
pnpm type-check
pnpm build-only
pnpm lint
git diff --check
```

Expected: each command exits with code 0. If the repository has pre-existing lint failures unrelated to changed files, record exact failures and run ESLint against the changed TypeScript/Vue files to prove the implementation introduces none.

- [ ] **Step 3: Inspect final task-branch state**

```bash
git status --short --branch
git log --oneline --decorate -8
git diff main...HEAD --stat
```

Expected: no uncommitted task files; the diff contains the search implementation, its tests, and the two approved design documents unique to this branch.

- [ ] **Step 4: Merge the search branch into main**

```bash
git switch main
git merge --no-ff codex/search-trigger-sparkle -m "merge: integrate compact search dialog"
```

Expected: clean merge with all search commits and the previously unique 3D orientation design document retained.

- [ ] **Step 5: Preserve superseded branch history without restoring old code**

The old `codex/background-triangle-3d` branch predates and is superseded by the newer global 3D background architecture on `main`. Record it as merged using the `ours` strategy:

```bash
git merge -s ours --no-ff codex/background-triangle-3d -m "merge: record superseded triangle background history"
```

Expected: merge commit created with the pre-merge `main` tree unchanged.

- [ ] **Step 6: Re-run verification on merged main**

```bash
pnpm vitest run src/utils/test/LocalCache.test.ts src/components/navbar/cpns/test/NavBarSearch.test.ts
pnpm type-check
pnpm build-only
git status --short --branch
```

Expected: tests, type check, and build pass; working tree is clean on `main`.

- [ ] **Step 7: Remove obsolete worktree and local branches**

```bash
git worktree remove /Users/yangdanping/Desktop/personal_project/coderx/.worktrees/background-triangle-3d
git branch -d codex/background-triangle-3d
git branch -d codex/search-trigger-sparkle
git branch --format='%(refname:short)'
git worktree list
```

Expected: the only local branch is `main`, and the only worktree is `/Users/yangdanping/Desktop/personal_project/coderx`.

- [ ] **Step 8: Final status**

```bash
git status --short --branch
git log --oneline --decorate -10
```

Expected: clean `main`, ahead of `origin/main` by the local implementation and merge commits. Do not push because the user did not request a remote mutation.
