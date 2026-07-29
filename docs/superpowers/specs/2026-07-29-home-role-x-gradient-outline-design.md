# Home Role X Gradient Outline Design

## Goal

Change the animated homepage role suffix `X` from a filled role-specific gradient to a thin, hollow outline while preserving the existing Coder, Writer, Creator, and Builder gradient colors.

## Scope

- Keep the current hero layout, `GeistPixel-Line` title, sans-serif oblique `X`, title sizing, reserved desktop width, mobile behavior, and wall-hit scramble timing.
- Keep the current four role palettes and gradient direction.
- Apply the outlined treatment to the accent cell throughout scramble frames so the suffix does not flash between filled and outlined rendering.
- Do not redesign other homepage typography or change non-accent scramble cells.

## Rendering Design

`ScrambleFrameText.vue` will continue to own one cell per character. When the cell is the computed accent index and gradient-outline rendering is enabled, the cell will contain an inline SVG `<text>` element instead of ordinary filled text.

The SVG glyph uses:

- `fill="none"` so the mesh and page background remain genuinely visible through the glyph;
- an SVG `linearGradient` stroke so the outline preserves the active role palette;
- a thin, scalable stroke with rounded joins for a clean edge at desktop and mobile title sizes;
- a per-component unique gradient ID so the visible title and hidden desktop sizing title cannot collide.

Non-accent cells retain the current HTML text rendering. The component receives an explicit Boolean prop so other `ScrambleFrameText` consumers keep their existing output.

## Color Tokens

Each existing role gradient will be backed by two semantic color-stop tokens. The existing `--*-x-gradient` variables remain available and are rebuilt from those stops, preserving current colors for existing CSS consumers.

`Home.vue` maps the active role to both the existing gradient and its start/end stops. The SVG stops consume only the active start/end tokens because SVG strokes cannot consume a CSS `linear-gradient()` value directly.

## Accessibility and Layout

- The outer component retains the full target in `aria-label`.
- Per-character cells and the decorative SVG remain `aria-hidden`.
- The accent cell width, gap, right-side safety space, baseline, and overflow behavior remain unchanged.
- The hidden desktop sizing instance uses the same SVG glyph path and metrics as the visible title, so the reserved width stays accurate.
- No new animation is introduced, so reduced-motion behavior is unchanged.

## Testing and Verification

- Add a component test that first fails until outlined accent rendering is enabled and proves the accent cell contains an SVG text glyph, a unique gradient, transparent fill, and two configured color stops.
- Preserve tests proving ordinary cells and empty frames still render correctly.
- Update the homepage integration contract to prove the outline option and active stop tokens are wired for all four role titles.
- Run focused Vitest suites, Vue type checking, linting, and the production build.
- Visually inspect the homepage at desktop and mobile widths to confirm the outline is thin, hollow, aligned, unclipped, and switches palettes with the role.
