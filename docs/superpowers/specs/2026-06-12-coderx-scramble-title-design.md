# CoderX Scramble Title Design

## Goal

Replace the homepage's hand-written typing effect with `@scrambl/vue` text scramble animation. Keep the gradient `X` fixed while cycling the prefix through `Coder`, `Writer`, `Creator`, and `Builder`.

## Public API

Create a reusable cycling component that accepts:

- `words`: words to cycle through.
- `cycleDelay`: idle time after an animation completes before the next word starts. Default: `2000`.
- `preset`: an exported preset name.
- Every `ScrambleOptions` field from `@scrambl/core`: `text`, `from`, `chars`, `cursor`, `duration`, `delay`, `ease`, `steps`, `perturbation`, `revealRate`, `settleDuration`, `settleRate`, `reversed`, `override`, `fill`, `seed`, `speed`, `loop`, `renderMode`, `onStart`, `onChange`, and `onComplete`.
- Vue-specific options from `@scrambl/vue`: `trigger`, `playOnMount`, and `inViewOptions`.
- `as`: the rendered HTML tag, matching the official `ScrambleText` component API.

Explicit props override values supplied by the selected preset.

Export these constants:

- `SCRAMBLE_PRESETS`
- `DEFAULT_SCRAMBLE_PRESET`
- `CODERX_ROLE_WORDS`

The default preset is `pixelBlocks`, documented in Chinese as a block-pixel disturbance style that matches CoderX's retro technical identity. Additional presets are `terminalBinary` and `softBraille`.

## Component Design

`ScrambleWord.vue` performs one animation with `useScramble`. It forwards lifecycle callbacks as non-conflicting `scramble-start`, `scramble-change`, and `scramble-complete` Vue events while also invoking the official callback props.

`CyclingScrambleText.vue` owns the active word and cycle timer. Because `@scrambl/vue@0.1.1` snapshots options during setup, each word change uses a keyed `ScrambleWord` instance so the next target text and options are applied reliably.

The cycle sequence is:

1. Animate the active word.
2. Receive the core `onComplete` callback.
3. Wait `cycleDelay` milliseconds.
4. Advance the word index.
5. Mount a fresh keyed animation instance.

The component clears pending timers on unmount and when cycle inputs change. Empty `words` falls back to `text`; a single effective word does not schedule another cycle.

## Accessibility

When `prefers-reduced-motion: reduce` matches, render the first effective word without starting or repeating animation. The fixed `X` remains visible.

## Homepage Integration

Remove the old counter, interval, cursor string, and `isLast` state from `Home.vue`. Render the cycling component followed by a dedicated gradient `X` element. Preserve the current title typography, hover shadow, layout, and responsive behavior.

## Testing

Component tests verify:

- preset constants and default word list;
- complete callback waits exactly `cycleDelay` before switching;
- explicit props override preset values and all official options reach `useScramble`;
- callback props and Vue events are both forwarded;
- timers are cleaned up;
- reduced-motion and single-word modes do not cycle.

Run focused Vitest tests, type checking, linting, production build, and browser visual verification.
