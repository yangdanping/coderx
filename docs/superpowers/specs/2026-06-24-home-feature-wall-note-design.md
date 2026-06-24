# Home Feature Wall Note Design

## Goal

Replace the current rigid, floating-looking Feature note with a believable sheet of sticky paper: its upper adhesive area stays visually flush with the wall while only the lower outer corner gradually lifts away.

## Confirmed Direction

- Preserve the existing note position, content hierarchy, yellow palette, alternating left/right placement, guide arrow, activation behavior, and mobile fallback.
- Stop using whole-note `rotateY` as the primary depth cue.
- Do not rely on an exaggerated irregular polygon or a large detached shadow.
- Treat the homepage Feature note as a flagship visual detail rather than an MVP approximation.

## Considered Approaches

### A. Layered HTML and CSS paper model — selected

Keep semantic copy in HTML and split the visual into a positioning wrapper, paper sheet, top contact band, localized cast shadow, and lower-corner curl. Each cue describes the same light and attachment model.

This is easy to tune in DevTools, preserves text quality and accessibility, supports both themes, and does not add a rendering dependency.

### B. Continue styling the existing rectangle with pseudo-elements

This is the smallest code change, but the body remains a rigid plane. More gradients and shadows would decorate the symptom without correcting the physical model.

### C. SVG or Canvas displacement

A displacement filter or mesh could produce genuine surface deformation, but it would also distort text, increase rendering cost, complicate responsive sizing, and make theme tuning harder. The homepage note does not need that complexity.

## Component Structure

`FeatureCard.vue` remains the sole owner of the note artwork.

- `.feature-card__note`: positioning and entrance wrapper.
- `.feature-card__note-shadow`: localized wall shadow under the lifted outer corner.
- `.feature-card__note-sheet`: rectangular paper surface and semantic text.
- `.feature-card__note-contact`: subtle top adhesive/contact band.
- `.feature-card__note-curl`: local lower-corner underside highlight.

No new composable or shared component is needed because this is isolated presentation with no new state.

## Physical Model

### Attached upper edge

- The transform origin moves to the top edge.
- The whole sheet keeps only a slight Z rotation and minimal X tilt.
- A narrow, low-contrast contact band near the top indicates that the adhesive strip is pressed against the wall.
- The top edge receives almost no external cast shadow.

### Continuous paper surface

- The paper becomes more opaque and less glass-like.
- Broad, low-contrast gradients create gentle illumination across the sheet rather than a visible decorative gradient.
- A localized radial gradient darkens the lifting corner before it reaches the underside, making the transition continuous.
- The rectangular silhouette remains intact; any edge variation stays sub-pixel or extremely restrained.

### Lifted outer corner

- Only the lower-left corner lifts for notes placed left of the demo; only the lower-right corner lifts for notes placed right of it.
- The cast shadow occupies roughly the outer third of the note and grows softer and farther from the sheet toward the corner.
- The curl element is a small curved underside highlight connected to the sheet, not a separate strip under the complete bottom edge.
- `noteCurlAngle` continues to control lift intensity, but it affects local curl and shadow strength rather than rotating the entire note as a rigid board.

## Theme And Responsive Behavior

- Light mode uses warm ivory paper, a faint yellow tint, brown-gray ink, and restrained warm shadows.
- Dark mode uses charcoal paper with warm yellow undertones and a darker localized wall shadow.
- At `max-width: 768px`, the detached note artwork, contact band, curl, and cast shadow remain disabled; the existing unified mobile Feature card stays unchanged.
- Reduced-motion mode renders the same final physical state without the entrance transition.

## Testing And Verification

- Markup tests confirm the sheet, contact, curl, and shadow layers exist and remain decorative where appropriate.
- Source contracts reject whole-note `rotateY(var(--note-curl-tilt-y))` and the previous 66%-wide underside treatment.
- Tests confirm `noteCurlAngle` remains clamped and mirrored while exposing a normalized lift-strength variable.
- Run the focused FeatureCard tests, ESLint for changed files, type-check, and production build.
- Inspect left and right notes in light and dark themes at desktop width and confirm the mobile layout is unchanged.

## Non-Goals

- No change to Feature copy, demos, guide-arrow geometry, section layout, or scroll mask.
- No Canvas, SVG displacement filter, image texture, or new package.
- No redesign of the mobile Feature header.
