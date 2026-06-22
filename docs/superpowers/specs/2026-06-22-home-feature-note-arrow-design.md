# Home Feature Note And Arrow Design

## Goal

Refresh the homepage transition into the Feature section without changing the existing `Go Exploring >` button:

- replace the `How to Play` heading and intro with a borderless double-chevron downward icon that owns the `features` anchor;
- give the downward arrow a continuous top-to-bottom light sweep;
- render each Feature eyebrow, title, and description on a fresh translucent yellow-tinted glass-paper note;
- add a hand-drawn solid green arrow beside each note that draws once when its card first enters the viewport.

## Confirmed Product Direction

- Only the `Feature 01 + title + description` header becomes a note. The demo body remains unchanged.
- The note palette is based on the yellow semicircle in `src/assets/img/bg.svg`: `rgb(253 214 99)`.
- The existing `HomeExploreLink.vue` implementation is reference-only and must not be modified.
- The hand-drawn guide uses the `rgb(190 224 198)` green from the rectangle in `bg.svg`.
- Its curved line draws fully before the arrowhead begins, and the complete sequence plays once when the Feature card enters the viewport.
- Dark mode must remain readable and visually related to the light-mode yellow paper.

## Considered Approaches

### A. Inline SVG plus existing viewport state — selected

Use an isolated SVG component for the section arrow and an inline decorative SVG inside the Feature header. Reuse `FeatureCard`'s existing `isVisible` state to trigger both the note entrance and solid-path drawing.

This keeps vector artwork crisp, requires no new dependency or observer, supports `stroke-dasharray` animation naturally, and has a small rendering cost.

### B. CSS-only clip paths and pseudo-elements

Build both arrows from borders, rotated rectangles, and pseudo-elements. This is compact for a simple chevron, but cannot reproduce the hand-drawn curved guide cleanly and makes path drawing difficult.

### C. Canvas drawing

Render the arrows and paper note with Canvas, borrowing the interaction architecture used by `HomeExploreLink.vue`. This provides maximum control but would duplicate substantial lifecycle and dark-mode code for artwork that SVG and CSS already express well.

## Component Map

### `FeatureSection.vue`

Composition surface for the Feature area. It replaces `SectionTitle` and the intro paragraph with `FeatureSectionAnchor`, then renders the existing Feature cards unchanged.

### `FeatureSectionAnchor.vue`

Owns the semantic `features` anchor and the double-chevron SVG. The anchor remains keyboard focusable and clickable without a rectangular focus border; a soft icon glow supplies keyboard focus feedback. Light strokes loop through both chevrons, while reduced-motion mode displays a static highlight.

### `FeatureCard.vue`

Keeps its existing props, activation event, viewport observation, demo slot, scroll-linked mask, and demo activation behavior. Its header becomes the yellow note and gains a decorative, aria-hidden hand-drawn arrow. The existing `visible` class triggers the note reveal and one-shot SVG path drawing.

No new shared composable is needed because `FeatureCard` already exposes the exact one-shot viewport state required by this feature.

## Visual Design

### Section Anchor

- A centered pair of hand-drawn downward chevrons replaces both `How to Play` and its supporting line.
- The arrow uses the existing blue/periwinkle interface accent so it reads as navigation rather than another yellow note.
- Highlight strokes travel through the upper and lower chevrons in a calm staggered loop.
- Hover and keyboard focus slightly increase contrast and glow without drawing a rectangular border.
- The anchor target is the arrow element itself, with `scroll-margin-top` preserving navbar clearance.

### Feature Note

- The header becomes a slightly rotated translucent rectangular note with all four corners intact.
- Light mode combines a white glass surface with a restrained `rgb(253 214 99)` tint, a fine warm edge, and dark brown-gray ink.
- Dark mode uses a translucent charcoal surface, restrained yellow tint, lighter yellow edge, and warm cream ink.
- A local underside highlight and contact shadow make the paper look incompletely attached to the wall. Only the lower outer edge lifts: lower-left for notes left of the demo, lower-right for notes right of the demo.
- Existing dot-grid and green marker treatments are removed from the header because they compete with the paper-note metaphor.
- The note enters with a short fade, upward translation, and slight rotation correction after the card becomes visible.
- Text remains real HTML and retains the existing eyebrow, heading, and paragraph hierarchy.

### Hand-Drawn Solid Arrow

- The decorative SVG stays entirely in the gap between note and demo on wide screens and points to the note's top edge rather than covering text.
- The path uses one continuous rounded stroke in the `rgb(190 224 198)` background-art green.
- The arrowhead is a separate path and starts only after the curved line has finished drawing.
- On compact layouts it moves above the note and scales down so it does not reduce text width.
- It is `aria-hidden` and never intercepts pointer input.

## Motion

- The section arrow light sweep loops continuously because it communicates “continue downward.”
- The note reveal takes about 600–700 ms with an exponential ease-out.
- The solid guide path draws once over roughly 2.4 seconds after the card becomes visible so the hand-drawn motion remains noticeable; the arrowhead follows after the path completes.
- Staggering continues to use each card's existing `delay` prop.
- Only `transform`, `opacity`, and SVG stroke properties animate. Layout dimensions do not animate.
- Under `prefers-reduced-motion: reduce`, the note and guide arrow render immediately in their final states and the section arrow shows a static highlight.

## Responsive Behavior

- The large section arrow remains centered and scales with `clamp()`.
- Wide desktop layouts alternate notes left, right, left, right, lift the outer lower paper edge, and reserve a clear gap for the connector without overlapping demo content.
- At the existing mobile breakpoint, the note uses the full available width and the guide arrow becomes a smaller top decoration.
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
- Component test confirms Feature header content remains semantic text inside a note and includes one decorative guide-arrow SVG.
- Source-level motion contracts confirm the looped arrow sweep, one-shot solid-path animation, dark-mode overrides, responsive rules, and reduced-motion fallback.
- Existing Feature activation behavior remains covered by a focused visibility test.
- Run focused Feature tests, type-check, lint for changed files where practical, and production build.
- Verify light mode, dark mode, desktop, and mobile in the real homepage.

## Non-Goals

- No change to `HomeExploreLink.vue` or its tests.
- No change to Feature demo content, data files, activation timing, or scroll-linked demo mask.
- No global animation library or new package.
- No redesign of the hero, navbar, hot-author section, or page background.
