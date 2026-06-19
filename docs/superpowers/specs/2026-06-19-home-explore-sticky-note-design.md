# Home Explore Sticky Note Design

## Goal

Add a prominent shortcut beneath the homepage hero title that sends new visitors directly to the article column page (`/article`). The shortcut should reduce the discovery path without competing with the animated hero illustration.

## Confirmed Direction

- CTA copy: `Start Exploring`
- Destination: named route `article`
- Placement: below the `Welcome to / WriterX` title block, in the approximate area marked by the user
- Visual language: a warm yellow sticky note combining handmade paper character with CoderX's retro pixel/terminal aesthetic
- Signature detail: a curved page curl at the bottom-right corner
- Shadow: a restrained two-line ASCII/dither shadow below the paper
- Rendering: semantic HTML and CSS; no Canvas

## Component Boundary

Create a focused homepage component, `HomeExploreLink.vue`, responsible for:

- rendering the semantic navigation link;
- rendering decorative paper texture, curved curl, contact shadow, and ASCII shadow;
- containing its hover, focus, active, dark-mode, reduced-motion, and responsive styles.

`Home.vue` only places the component in the hero title area. Navigation should use Vue Router through `RouterLink` with the named `article` route.

## Visual Design

### Resting State

- Compact horizontal note, approximately 196–220 px wide on desktop.
- Warm ochre/yellow paper with subtle line texture and restrained tonal variation.
- Slight counter-clockwise rotation so it feels placed by hand, not like a generic rectangular button.
- Uppercase pixel/monospace label with sufficient contrast.
- The bottom-right corner exposes a small curved paper curl with visible front/back tonal separation.
- A small contact shadow sits underneath the curl.
- Two short rows of `░`, `▒`, and `▓` form the retro ASCII shadow below the paper. It must read as a shadow, not as body copy.

### Hover and Keyboard Focus

- The note lifts slightly using `transform`.
- The curved bottom-right curl enlarges and rotates slightly from its bottom-right transform origin.
- The curl contact shadow separates subtly from the paper.
- The ASCII shadow shifts a few pixels and becomes slightly more visible.
- Keyboard focus receives a high-contrast, offset focus ring in addition to the motion feedback.
- Motion uses transform and opacity only, with a natural ease-out curve.

### Active State

- Apply a small downward/scale press response without hiding the focus indicator.

### Dark Mode

- Preserve the yellow paper identity, but deepen the paper and shadow values enough to avoid glow and retain contrast against the dark hero background.

## Responsive Behavior

### Desktop

- CTA stays left-aligned under the title and does not overlap the shader canvas.
- Keep enough vertical space below the ASCII shadow before the hero section ends.

### Tablet and Mobile

- The existing hero stacks vertically at its current content-driven breakpoint.
- The CTA centers with the title.
- Width remains fluid but does not become a full-width banner.
- Interactive area remains at least 44 px high.
- Touch devices do not depend on hover: the curl is slightly more open at rest and the active state provides feedback.
- The CTA remains visible and functional at 320 px viewport width.

## Accessibility

- Use a real link via `RouterLink`, not a `div` with a click handler.
- Accessible name is the visible `Start Exploring` text.
- Decorative curl and ASCII shadow are hidden from assistive technology.
- Provide a visible `:focus-visible` treatment.
- Respect `prefers-reduced-motion`; retain state distinction without animated transitions.
- Do not rely on color alone to communicate interactivity.

## Testing and Verification

- Component test confirms the link resolves to the named `article` route and exposes the expected label.
- Type-check and production build must pass.
- Verify desktop and mobile layouts in the browser, including 320 px width.
- Verify hover, keyboard focus, touch/active behavior, dark mode, and reduced motion.
- Run the current Web Interface Guidelines review against changed UI files and address actionable findings.

## Non-Goals

- No Canvas or WebGL implementation.
- No changes to the article page.
- No new global animation library.
- No redesign of the existing hero title, shader, navbar, or surrounding homepage sections.
- No analytics event unless requested separately.
