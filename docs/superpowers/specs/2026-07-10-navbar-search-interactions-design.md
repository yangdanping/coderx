# Navbar Glass Reveal and Search Interaction Design

## Goal

Make the shared CoderX header visually transparent at the top of the window and progressively restore its current glass background, blur, and shadow while the page scrolls. At the same time, make article-title search case-insensitive end to end and give the mobile search experience a clear, accessible place in the right-side action cluster with an explicit exit path.

## Selected Approach

Use a small Vue composable to turn `window.scrollY` into a clamped reveal progress, then pass that progress to a dedicated glass pseudo-element through a CSS custom property. Keep search term normalization in the frontend and use PostgreSQL `ILIKE` for title matching in every backend search query. Render the search trigger in the right-side action cluster at every viewport size and add a mobile-visible close control inside the full-screen search header.

This approach is selected because it preserves the current themed glass tokens, works for both global and detail-page `NavBar` instances, exposes a stable prop contract, and can be verified with deterministic unit tests.

## Alternatives Considered

### CSS scroll-driven animation

`animation-timeline: scroll()` could remove the JavaScript listener. It is rejected because browser support and testability are weaker, and mapping runtime Vue props to a scroll timeline would make the public API less predictable.

### Threshold-only class toggle

A single `scrolled` class would be simple and inexpensive. It is rejected because it restores the glass abruptly and does not meet the requirement for a progressive reveal.

### Moving only the mobile trigger with CSS order

CSS `order` cannot move the existing trigger from the center grid cell into the separate right-side component that owns the avatar. It is rejected because the DOM and keyboard order would still disagree with the visual layout.

## Architecture

### Component map

- `src/components/navbar/NavBar.vue` owns the header layout, the public glass-distance props, and the CSS variable consumed by the glass layer.
- `src/composables/useNavbarGlass.ts` owns the passive window scroll listener, requestAnimationFrame scheduling, progress calculation, prop-change recalculation, and teardown.
- `src/components/navbar/cpns/NavBarRight.vue` remains the right-side action composition surface. Its slot content is rendered before the avatar and other user controls.
- `src/components/navbar/cpns/NavBarSearch.vue` owns the search trigger, full-screen/mobile dialog, focus movement, history, result announcement, and close behavior.
- `../coderx_server/src/service/sql/article.sql.js` owns the list and quick-search title predicates.
- `../coderx_server/src/service/article.service.js` owns the matching total-count query and must use the same case-insensitive title semantics.

### Header glass reveal

`NavBar` will expose these optional props:

- `glassRevealStart`, default `0`: window scroll offset where the glass begins to appear.
- `glassRevealEnd`, default `96`: window scroll offset where the current glass effect is fully restored.

The progress formula is:

```text
clamp((scrollY - start) / (end - start), 0, 1)
```

The composable reads the scroll position once per animation frame, registers the listener as passive, initializes from the current scroll position, recalculates when either prop changes, and removes listeners plus pending animation work on unmount.

The header itself stays fully opaque so its logo, navigation, and controls never fade. A full-size `::before` layer receives the existing `var(--glass-bg)`, `var(--glass-blur)`, and current shadow, while its opacity is driven by `--navbar-glass-progress`. At progress `0`, background, blur contribution, and shadow are visually absent. At progress `1`, the result matches the current `@include glass-effect` appearance. The layer is non-interactive and sits below `.list` so popups and controls keep their existing behavior.

The default applies to every shared `NavBar`, including the detail-page instance. Consumers can tune the two distances without duplicating scroll logic.

### Search data flow

The frontend keeps `normalizeSearchKeyword()` so cache keys and requests remain stable across `vue`, `Vue`, and `VUE`. Case-insensitive behavior is guaranteed by the PostgreSQL layer rather than by relying on client casing.

Three backend title predicates change from `LIKE` to `ILIKE`:

1. navbar quick-search suggestions;
2. paginated article-list search;
3. the matching total-count query.

The scope remains title search. Article JSON content, excerpt, tags, and author fields are not added to the predicate. Existing parameter placeholders remain in use, and no database data or schema migration is required.

### Responsive search layout

`NavBarSearch` moves out of the mobile center cell and is always rendered in the `NavBarRight` slot. Desktop keeps the order `NavMenu → Search → Avatar`; mobile hides `NavMenu`, producing `Search → Avatar`. The center cell remains available for the detail toolbar and user-page back action. The JavaScript and SCSS breakpoint semantics will both treat `768px` as mobile.

At mobile widths:

- the shortcut `<kbd>` is hidden;
- the search trigger has an actual minimum touch target of 44 CSS pixels after the project's px-to-rem transform;
- the full-screen input row adds an icon-only close button on its right edge;
- the close button has an accessible name and visible focus state;
- the dialog accounts for safe-area insets.

The close control lives inside the full-screen dialog because the original navbar trigger is covered while the dialog is active. Desktop continues to support backdrop click, Escape, and `Ctrl/⌘ K` toggling.

### Focus, navigation, and announcements

The existing accessible dialog name, `role="dialog"`, and `aria-modal="true"` remain part of the search contract. The trigger and dialog receive template refs. While the teleported dialog is open, the application root behind it becomes `inert`, and its previous inert state is restored on close or unmount. A small Tab/Shift+Tab handler keeps keyboard focus within the currently rendered dialog controls.

On desktop, opening focuses the search input. On mobile, opening focuses the close button instead of forcing the software keyboard open. Closing through the button, backdrop, Escape, or shortcut restores focus to the trigger after the overlay leaves.

Article results become real links with resolved article URLs, `target="_blank"`, and `rel="noopener noreferrer"`. Opening results in a new tab intentionally preserves the current `window.open(..., '_blank')` behavior. Clicking a result still records history and closes the dialog, while native link behavior adds correct modifier-key and context-menu interaction. Loading, result-count, and empty-result changes are exposed through a concise polite live region.

## Error and Edge Handling

- Negative reveal offsets are treated as `0`.
- If `glassRevealEnd` is not greater than `glassRevealStart`, the effective end is normalized to at least one pixel after the start so progress never divides by zero.
- Initial mounting at a nonzero scroll position immediately shows the correct glass state.
- Repeated scroll events cannot queue more than one animation-frame update.
- Unmounting cancels pending animation work and removes the window listener.
- Mobile opening does not automatically summon the on-screen keyboard.
- The background application is inert only while the teleported modal is open, and Tab navigation cannot escape into background controls.
- A pre-existing inert state on the application root is preserved rather than overwritten.
- Body scroll locking is always released on close and component unmount.
- An empty or whitespace-only keyword makes no request and cannot be submitted.
- Search SQL remains parameterized; changing to `ILIKE` does not introduce string interpolation.

## Testing

### Frontend tests

Add unit coverage for the pure progress calculation and composable lifecycle:

- top, midpoint, end, and over-end values;
- nonzero starts and invalid ranges;
- initial nonzero scroll;
- requestAnimationFrame coalescing;
- prop changes and unmount cleanup.

Extend navbar/search component coverage to verify:

- the public props feed the glass progress variable;
- search is in the right-side slot before the avatar at desktop and mobile widths;
- `768px` uses the mobile branch;
- the mobile shortcut hint is hidden and trigger/close targets compute to at least 44 CSS pixels;
- the mobile close control exits the dialog;
- desktop and mobile focus destinations plus focus restoration;
- dialog naming and modal semantics remain present;
- Tab and Shift+Tab wrap within the dialog, while the background application is inert and restored on close/unmount;
- Escape and `Ctrl/⌘ K` continue to toggle the dialog;
- results render as safe native links and live status text updates.

### Backend tests

Write failing SQL contract tests first, then require:

- paginated title filtering uses `ILIKE`;
- quick-search suggestions use `ILIKE`;
- total counting uses the same `ILIKE` title predicate;
- all statements retain placeholders and expected parameter order.

Run a read-only database/API verification showing `vue`, `Vue`, and `VUE` return equivalent title result sets for both quick search and paginated search, with each list total equal to its result set. The check must not depend on a fixed row count because local article data can change.

### Final verification

Run focused tests after each red-green cycle, then the complete frontend and backend test suites, frontend ESLint, Vue type checking, and the production build. Verify the running app at desktop, 768px, 390px, and 320px widths in light and dark themes, checking top/mid/end scroll states, action order, actual touch-target dimensions, open/close focus behavior, and case-insensitive results.

## Scope

Included:

- progressive shared-navbar glass reveal with developer-configurable start/end props;
- consistent behavior on global and detail-page headers;
- case-insensitive PostgreSQL title search for suggestions, lists, and totals;
- right-aligned mobile search trigger before the avatar;
- hidden mobile shortcut hint;
- explicit mobile close control, focus restoration, safe result links, and search-status announcements;
- regression tests and cross-viewport verification.

Excluded:

- searching article body JSON, excerpts, tags, authors, or comments;
- database migrations, trigram indexes, or full-text search;
- redesigning the navbar's existing logo, menus, theme controls, notifications, or user panels;
- changing route structure or search-history storage;
- refactoring unrelated existing worktree changes.
