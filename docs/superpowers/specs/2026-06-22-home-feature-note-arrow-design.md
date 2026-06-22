# Home Feature Note And Arrow Design

## Goal

Refresh the homepage transition into the Feature section without changing the existing `Go Exploring >` button:

- replace the `How to Play` heading and intro with a large downward arrow that owns the `features` anchor;
- give the downward arrow a continuous top-to-bottom light sweep;
- render each Feature eyebrow, title, and description on a warm yellow paper note;
- add a hand-drawn dashed arrow beside each note that draws once when its card first enters the viewport.

## Confirmed Product Direction

- Only the `Feature 01 + title + description` header becomes a note. The demo body remains unchanged.
- The note palette is based on the yellow semicircle in `src/assets/img/bg.svg`: `rgb(253 214 99)`.
- The existing `HomeExploreLink.vue` implementation is reference-only and must not be modified.
- The hand-drawn dashed arrow plays once from start to finish when the Feature card enters the viewport.
- Dark mode must remain readable and visually related to the light-mode yellow paper.

## Considered Approaches

### A. Inline SVG plus existing viewport state — selected

Use an isolated SVG component for the section arrow and an inline decorative SVG inside the Feature header. Reuse `FeatureCard`'s existing `isVisible` state to trigger both the note entrance and dashed-path drawing.

This keeps vector artwork crisp, requires no new dependency or observer, supports `stroke-dasharray` animation naturally, and has a small rendering cost.

### B. CSS-only clip paths and pseudo-elements

Build both arrows from borders, rotated rectangles, and pseudo-elements. This is compact for a simple chevron, but cannot reproduce the hand-drawn curved dashed arrow cleanly and makes path drawing difficult.

### C. Canvas drawing

Render the arrows and paper note with Canvas, borrowing the interaction architecture used by `HomeExploreLink.vue`. This provides maximum control but would duplicate substantial lifecycle and dark-mode code for artwork that SVG and CSS already express well.

## Component Map

### `FeatureSection.vue`

Composition surface for the Feature area. It replaces `SectionTitle` and the intro paragraph with `FeatureSectionAnchor`, then renders the existing Feature cards unchanged.

### `FeatureSectionAnchor.vue`

Owns the semantic `features` anchor and the large downward-arrow SVG. The anchor remains keyboard focusable and clickable. Its light band loops downward inside the arrow shape, while reduced-motion mode displays a static highlighted arrow.

### `FeatureCard.vue`

Keeps its existing props, activation event, viewport observation, demo slot, scroll-linked mask, and demo activation behavior. Its header becomes the yellow note and gains a decorative, aria-hidden hand-drawn arrow. The existing `visible` class triggers the note reveal and one-shot SVG path drawing.

No new shared composable is needed because `FeatureCard` already exposes the exact one-shot viewport state required by this feature.

## Visual Design

### Section Anchor

- A centered, oversized downward arrow replaces both `How to Play` and its supporting line.
- The arrow uses the existing blue/periwinkle interface accent so it reads as navigation rather than another yellow note.
- A clipped highlight band travels from the top of the arrow toward its tip in a calm loop.
- Hover and keyboard focus slightly increase contrast without changing layout.
- The anchor target is the arrow element itself, with `scroll-margin-top` preserving navbar clearance.

### Feature Note

- The header becomes a slightly rotated paper note with an asymmetric clipped silhouette and a folded bottom-right corner.
- Light mode uses a translucent version of `rgb(253 214 99)` with a warmer edge and dark brown-gray ink.
- Dark mode uses a deeper ochre surface, lighter yellow edge, and warm cream ink; it is not a simple inverted light theme.
- Existing dot-grid and green marker treatments are removed from the header because they compete with the paper-note metaphor.
- The note enters with a short fade, upward translation, and slight rotation correction after the card becomes visible.
- Text remains real HTML and retains the existing eyebrow, heading, and paragraph hierarchy.

### Hand-Drawn Dashed Arrow

- The decorative SVG sits outside the note on wide screens and bends back toward the note, matching the supplied reference.
- The path uses rounded dashed strokes in the existing warm red accent.
- The arrowhead is a separate path and follows the same one-shot reveal choreography.
- On compact layouts it moves above the note and scales down so it does not reduce text width.
- It is `aria-hidden` and never intercepts pointer input.

## Motion

- The section arrow light sweep loops continuously because it communicates “continue downward.”
- The note reveal takes about 600–700 ms with an exponential ease-out.
- The dashed guide path draws once over roughly 900 ms after the card becomes visible; the arrowhead follows near the end.
- Staggering continues to use each card's existing `delay` prop.
- Only `transform`, `opacity`, and SVG stroke properties animate. Layout dimensions do not animate.
- Under `prefers-reduced-motion: reduce`, the note and dashed arrow render immediately in their final states and the section arrow shows a static highlight.

## Responsive Behavior

- The large section arrow remains centered and scales with `clamp()`.
- Desktop and wide tablet layouts reserve a modest left-side decoration zone for the dashed arrow while keeping note text readable.
- At the existing mobile breakpoint, the note uses the full available width and the dashed arrow becomes a smaller top decoration.
- The anchor keeps a minimum 44 px interactive target.

## Accessibility

- Use a real `<a href="#features">` for the section anchor.
- Add an explicit accessible label such as `进入核心特性`.
- Keep all decorative SVGs `aria-hidden="true"` and non-focusable.
- Preserve visible `:focus-visible` styling.
- Maintain readable text contrast in both themes.
- Respect reduced-motion preferences.

## Testing And Verification

- Component test confirms the `features` id and href live on the arrow anchor, and the old `How to Play` text is absent.
- Component test confirms Feature header content remains semantic text inside a note and includes one decorative dashed-arrow SVG.
- Source-level motion contracts confirm the looped arrow sweep, one-shot dashed-path animation, dark-mode overrides, responsive rules, and reduced-motion fallback.
- Existing Feature activation behavior remains covered by a focused visibility test.
- Run focused Feature tests, type-check, lint for changed files where practical, and production build.
- Verify light mode, dark mode, desktop, and mobile in the real homepage.

## Non-Goals

- No change to `HomeExploreLink.vue` or its tests.
- No change to Feature demo content, data files, activation timing, or scroll-linked demo mask.
- No global animation library or new package.
- No redesign of the hero, navbar, hot-author section, or page background.
