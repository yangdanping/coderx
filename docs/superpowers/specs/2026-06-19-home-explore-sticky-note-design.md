# Home Explore Sticky Note Design

## Goal

Redesign the homepage `Start Exploring` shortcut as a restrained retro paper note with a Canvas-rendered, StPageFlip-inspired page curl. It sends visitors directly to the article column page (`/article`) without competing with the existing hero title, shader, or diffuse background.

## Confirmed Direction

- CTA copy: `Start Exploring`
- Destination: named route `article`
- Placement: keep the existing position below the `Welcome to / WriterX` title block
- Visual language: flat, warm, retro paper with restrained pixel typography
- Interaction reference: the Canvas example at `https://nodlik.github.io/StPageFlip/`
- Selected interaction: option B from the approved visual study — a large bottom-right page lift whose fold responds subtly to pointer position
- Rendering: semantic `RouterLink` for interaction and Canvas 2D for the complete paper and fold visual
- Surface treatment: solid colors only; no highlights, gradients, inner shadows, filters, paper texture, or skeuomorphic lighting
- Remove the existing ASCII/dither shadow entirely

## Component Boundary

`HomeExploreLink.vue` remains the only feature component and is responsible for:

- rendering a semantic `RouterLink` with the visible label and named `article` route;
- rendering an `aria-hidden` Canvas below the link content;
- owning Canvas setup, DPR scaling, resize handling, pointer interaction, touch behavior, theme detection, reduced-motion behavior, animation cleanup, and drawing;
- containing focus, active, theme, and responsive styles that are not part of the paper drawing.

`Home.vue` remains a composition surface. Its current placement import and spacing may be retained, but its navbar, Flow-related code, hero mesh background, title animation, and shader must not be changed.

No external page-flip library will be added. The reference is used for interaction character, while the compact note-specific geometry is implemented directly with Canvas 2D Bézier paths.

## Visual Design

### Resting State

- Compact horizontal note, approximately 210–232 px wide on desktop.
- Warm ochre/yellow paper rendered as a single flat solid color.
- Slight counter-clockwise rotation so it feels placed by hand, not like a generic rectangular button.
- Uppercase pixel/monospace label with sufficient contrast.
- The bottom-right corner starts with a small but clearly lifted page tip.
- The reverse side uses one darker solid paper color.
- The exposed area beneath the lifted paper uses one quiet solid color that works in both themes.
- No independent CSS corner, cutout, contact shadow, or decorative shadow is rendered.

### Hover and Keyboard Focus

- On fine pointers, entering the link raises the bottom-right corner along a predefined page-flip trajectory.
- While hovered, normalized pointer coordinates influence the pull point and fold spine within strict bounds. The response must feel alive without causing the label to move or making the note difficult to click.
- The paper front is clipped by one or more cubic Bézier curves; the reverse fold is a second closed Bézier path. The changing paths must read as one continuous sheet being lifted, not a circular hole or triangular flap.
- Leaving the link returns the geometry smoothly to its resting state.
- Keyboard focus uses the same stable expanded state without pointer following and receives a high-contrast offset focus ring.
- The HTML link box and visible label remain stationary throughout Canvas animation.

### Active State

- Apply a small link-level press response without hiding the focus indicator.
- On touch or coarse-pointer devices, pointer press expands the fold and release/cancel restores it. The destination remains a normal link and does not depend on hover.

### Dark Mode

- Preserve the yellow paper identity with a slightly deeper solid front color, a distinguishable solid reverse color, and readable dark ink.
- Theme colors are read from CSS custom properties so Canvas redraws when the document's `dark` class changes.

## Responsive Behavior

### Desktop

- CTA stays left-aligned under the title and does not overlap the shader canvas.
- The Canvas fills the semantic link box and adds no separate layout footprint.

### Tablet and Mobile

- The existing hero stacks vertically at its current content-driven breakpoint.
- The CTA centers with the title.
- Width remains fluid but does not become a full-width banner.
- Interactive area remains at least 44 px high.
- Touch devices do not depend on hover and receive press feedback.
- The CTA remains visible and functional at 320 px viewport width.

## Canvas Lifecycle and Geometry

- Use a template ref for the Canvas and a separate link/container ref for pointer coordinates.
- Scale the backing store by `devicePixelRatio`, capped at a practical upper bound, while drawing in CSS pixels.
- Use `ResizeObserver` to resize and redraw without assuming a fixed layout width.
- Use `requestAnimationFrame` for interpolation between current and target openness/pointer values.
- Use natural ease-out interpolation with no bounce or elastic motion.
- Listen for `prefers-reduced-motion` changes. In reduced-motion mode, draw state changes immediately and do not start a continuing animation loop.
- Observe the root document class to redraw theme colors when dark mode changes.
- Cancel animation frames, disconnect observers, remove media-query/theme listeners, and release event listeners on unmount.
- Guard unavailable Canvas APIs in tests and non-browser rendering contexts.

## Accessibility

- Use a real link via `RouterLink`, not a `div` with a click handler.
- Accessible name is the visible `Start Exploring` text.
- Canvas is decorative and must use `aria-hidden="true"`.
- Provide a visible `:focus-visible` treatment.
- Respect `prefers-reduced-motion`; retain expanded focus/press state without interpolation.
- Do not rely on color alone to communicate interactivity.

## Testing and Verification

- Component test confirms the link resolves to the named `article` route and exposes the expected label.
- Component test confirms the Canvas is decorative and the removed CSS curl/ASCII shadow elements do not exist.
- Canvas-focused tests use a controlled 2D context, `ResizeObserver`, animation frame, DPR, pointer, reduced-motion, and cleanup stubs to verify lifecycle and geometry behavior without asserting implementation-irrelevant pixel snapshots.
- Tests confirm drawing uses cubic Bézier paths and solid fills, and that forbidden gradient/filter/inner-shadow/ASCII constructs are absent.
- Type-check and production build must pass.
- Verify desktop and mobile layouts in the browser, including 320 px width.
- Verify pointer-follow hover, restoration, keyboard focus, touch/active behavior, dark mode, reduced motion, and `/article` navigation on the real homepage.

## Non-Goals

- No full book/page-flip system or drag-to-turn interaction.
- No dependency on StPageFlip or another animation library.
- No image texture, lighting simulation, gradients, highlights, inner shadows, blur, or skeuomorphic depth.
- No changes to the article page.
- No new global animation library.
- No redesign of the existing hero title, shader, diffuse background, navbar, Flow, or surrounding homepage sections.
- No analytics event unless requested separately.
