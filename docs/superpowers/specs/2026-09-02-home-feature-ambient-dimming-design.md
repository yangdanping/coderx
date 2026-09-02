# Home Feature Ambient Dimming Design

## Goal

In light mode, scrolling into the home page Feature story should gradually move the visible page atmosphere from light to dark. Feature copy must remain readable using the same eye-friendly primary white as dark mode. Scrolling out of the story toward Hot Authors should reverse the effect and restore the normal light page.

## Chosen Interaction

The home page owns a clamped ambient progress value from `0` to `1`:

- entry progress rises while the Feature root travels from the lower viewport toward its reading position;
- exit progress falls as the bottom of the Feature root approaches and passes through the viewport;
- the final ambient progress is the lower of the entry and exit values, so it is reversible in either scroll direction;
- dark mode does not consume this progress because it already has a dark atmosphere;
- reduced-motion users keep the scroll-linked color response, but receive no additional time-based easing.

The progress drives a fixed, pointer-transparent dark surface behind the home content. It also drives Feature-local surface tokens. Feature text uses the dark palette as soon as the zone approaches, while preview surfaces settle faster than the viewport background; this prevents text and surfaces from crossing through the same low-contrast mid-gray. The navbar remains under the user's explicit theme and is not temporarily switched.

## Color Contract

Define `--eye-white: #ededed` globally and use it for dark mode primary text. This is intentionally softer than `#fff` while preserving strong contrast on the dark Feature surface.

At full ambient progress, Feature primary text is `--eye-white`; secondary text uses a softer neutral gray. Existing pure-white text values inside Feature demos are replaced with the semantic eye-white token. Light-mode values remain unchanged at progress `0`.

## Architecture

### `useFeatureAmbientDimming.ts`

A small Vue composable measures one Feature-zone element from a passive scroll/resize listener throttled with `requestAnimationFrame`. It exposes readonly progress and a synchronous `syncFromScroll` method for deterministic tests. It cancels a queued frame and removes listeners on unmount.

### `Home.vue`

Wrap `FeatureSection` in a referenced zone and write the progress to `--feature-ambient-progress`. A fixed pseudo-element provides the dark viewport surface while the Feature zone locally interpolates existing theme variables. The surrounding Hero, Hot Authors, and footer keep their current theme variables and become fully light again when progress returns to zero.

### Feature demos

Feature-specific hard-coded light surfaces that would remain glaring at full progress consume small semantic ambient variables supplied by the Feature zone. Existing dark-mode appearance is preserved.

## Testing and Verification

- Unit-test progress clamping, entry, plateau, exit, reverse scrolling, animation-frame throttling, and cleanup.
- Add source/style contract assertions for light-only application, the eye-white token, and reduced-motion handling.
- Run the focused home tests, full type-check, and production build.
- Inspect light and dark modes at desktop and mobile widths, including the transition from Feature to Hot Authors.

## Out of Scope

- Changing the stored theme or the navbar's explicit theme.
- Redesigning Feature layout, actions, copy, Hot Authors, or the footer.
- Adding a third-party animation library.
