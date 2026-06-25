# Theme Color Transition Design

## Goal

Add a restrained 300 ms color transition when a user explicitly switches between light and dark themes. Keep the transition policy centrally managed, preserve instant startup and system synchronization, and make Tiptap editor surfaces an explicit regression boundary.

## Selected Approach

Use a transient `theme-transitioning` class on the root `<html>` element.

- `useTheme.ts` owns the transition lifecycle and theme state changes.
- A dedicated global SCSS file owns duration, easing, animated properties, reduced-motion behavior, and special-surface documentation.
- Components continue to consume theme variables. They do not each define theme-switch durations.
- Tiptap article, comment, and Flow editors remain locally responsible for their colors, while the global transition policy covers their rendered surfaces and overlays.

This preserves a single source of truth without moving component-specific presentation into a global stylesheet.

## Alternatives Considered

### Permanent transitions on every component

Keeping color transitions active at all times would require little JavaScript, but it would also affect hover, focus, validation, and editor interactions outside theme changes. It is rejected because theme policy would leak into unrelated interaction timing.

### Per-component theme transitions

Adding transitions to each component gives precise control but creates shotgun surgery: every new theme-aware component would need another local declaration. It is rejected because adjustment and review would remain distributed.

### View Transition API

Snapshot-based transitions can produce a unified crossfade, but they are unnecessary for the requested ordinary color interpolation and introduce browser-specific behavior. It is rejected for this feature.

## Architecture

### Theme lifecycle

`src/composables/useTheme.ts` will:

1. Detect explicit user theme changes from `setMode`, `toggleDark`, and the `D` shortcut.
2. Skip animation when `prefers-reduced-motion: reduce` matches.
3. Add `theme-transitioning` before applying the new root theme class.
4. Remove the class after the centralized CSS duration.
5. Restart cleanup safely when users switch repeatedly before the previous transition finishes.

Initialization, system preference events, and cross-tab storage events remain immediate. They must not introduce startup FOUC or animate a tab that the user did not directly interact with.

### Global transition policy

Create `src/assets/css/theme-transition.scss` and import it from `src/assets/css/index.scss`.

The stylesheet will define:

- `--theme-transition-duration: 300ms`;
- `--theme-transition-easing: cubic-bezier(0.65, 0, 0.35, 1)`;
- explicit transition properties for theme-relevant paint values;
- no `transition: all`;
- no layout-property animation;
- a reduced-motion override that makes the transition immediate.

The transient rule will cover:

- `color`;
- `background-color`;
- `border-color`;
- `text-decoration-color`;
- `box-shadow`;
- `fill`;
- `stroke`;
- `filter`;
- theme-related opacity changes.

Existing component-specific transform and enter/leave animations remain authoritative.

### Special surfaces

The following are treated as special rendering boundaries:

- Tiptap article editor, toolbar, BubbleMenu, ProseMirror content, tables, quotes, and inline code;
- Tiptap comment editor and toolbar;
- Tiptap Flow editor and toolbar;
- Tiptap AI completion popovers;
- Canvas and WebGL renderers;
- image-backed and gradient-backed decorative surfaces.

Tiptap DOM surfaces use normal CSS paint properties and therefore participate in the centralized transition. Fixed dark code blocks remain visually stable because their computed colors do not change between themes. Canvas and WebGL renderers continue to react through their own theme-aware redraw logic; the global CSS transition does not attempt to interpolate pixels inside a canvas.

The transition stylesheet and tests will contain an explicit Tiptap coverage contract so future editor variants cannot be added without updating the theme-transition review boundary.

## Error and Edge Handling

- Repeated toggles cancel the previous cleanup timer and start one fresh lifecycle.
- A non-animated theme application removes any stale transition class first.
- Missing browser APIs fall back to an immediate theme change.
- Reduced-motion users receive the final theme without interpolation.
- The transition class never persists after its configured duration.

## Testing

### Composable tests

Extend `src/composables/test/useTheme.test.ts` to verify:

- explicit user changes add the transition class;
- the class is removed after the configured lifecycle;
- repeated toggles do not leave stale cleanup work;
- initialization remains immediate;
- reduced-motion preference skips the transition;
- native `color-scheme` remains synchronized.

### Style contract tests

Add `src/assets/css/test/theme-transition.test.ts` to verify:

- duration and easing are centrally defined;
- only explicit paint properties are transitioned;
- `transition: all` is absent;
- reduced-motion behavior exists;
- Tiptap article, comment, Flow, toolbar, BubbleMenu, and AI completion surfaces are named in the coverage contract.

### Verification

Run focused Vitest suites, the complete test suite, Vue type checking, and the production build. In the browser, switch themes on the article editor, comment editor, Flow editor, and a Tiptap popover, confirming that surfaces interpolate together while fixed code blocks remain stable.

## Scope

Included:

- user-triggered light/dark color interpolation;
- centralized timing and property policy;
- Tiptap regression coverage;
- reduced-motion handling.

Excluded:

- circular reveals or snapshot transitions;
- route transitions;
- redesigning theme colors;
- converting existing hard-coded colors unrelated to a visible theme-switch defect;
- pixel interpolation inside Canvas or WebGL.
