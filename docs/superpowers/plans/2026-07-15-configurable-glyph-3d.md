# Configurable Fixed-Glyph 3D System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` for every behavior change and `superpowers:verification-before-completion` before reporting completion.

**Goal:** Add a reusable, fixed `$` 3D module with `rounded | display | serif` source-code-selectable outlines, while moving the existing arrow into a centralized directory without changing any arrow file bytes or behavior.

**Architecture:** Keep the accepted arrow implementation isolated under `shape-3d/triangle`; expose its existing config only through a re-export. Build the glyph as a second independent module: three cleaned offline SVG assets feed one SVG parser, one geometry/material builder, one fallback descriptor, and one standalone Vite comparison preview. Do not mount the glyph in `App.vue` and do not create a shared runtime abstraction yet.

**Tech Stack:** Vue 3.5, TypeScript 6, Three.js 0.185.1 (`SVGLoader`, `ExtrudeGeometry`, fat lines), Vite 8, Vitest 4, pnpm, one-off Python generation through `uv` with pinned `fonttools` and `skia-pathops`.

## Global Constraints

- Treat [`docs/superpowers/specs/2026-07-15-configurable-glyph-3d-design.md`](../specs/2026-07-15-configurable-glyph-3d-design.md) as the source of truth.
- Never edit the six files currently inside `src/components/background/triangle-3d/`; move them with `git mv` and prove byte identity with SHA-256 plus 100% rename detection.
- Do not change arrow geometry, material values, fallback, initial pose, orbit, spin, renderer lifecycle, or tests.
- Do not import the glyph module from `App.vue`, the arrow Vue component, `triangle3d.ts`, or `triangle3d-runtime.ts`.
- Keep glyph font source files out of the repository. Commit only cleaned SVG outlines, one combined OFL record, and a source README.
- Do not add `shared/`; duplicated glyph-only outline/material/disposal code is intentional until both systems are stable.
- Use `ShapePath.toShapes()` only. Do not call deprecated `SVGLoader.createShapes()`.
- Keep `depth` independent of XY normalization: scale X/Y only, center X/Y, and center Z around zero.
- Every focused test command must pass before its task commit. Never stage `.superpowers/`.

## File Map

### Move without content changes

- `src/components/background/triangle-3d/BackgroundTriangle3D.vue` → `src/components/background/shape-3d/triangle/BackgroundTriangle3D.vue`
- `src/components/background/triangle-3d/triangle3d.ts` → `src/components/background/shape-3d/triangle/triangle3d.ts`
- `src/components/background/triangle-3d/triangle3d-runtime.ts` → `src/components/background/shape-3d/triangle/triangle3d-runtime.ts`
- `src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts` → `src/components/background/shape-3d/triangle/test/BackgroundTriangle3D.test.ts`
- `src/components/background/triangle-3d/test/triangle3d.test.ts` → `src/components/background/shape-3d/triangle/test/triangle3d.test.ts`
- `src/components/background/triangle-3d/test/triangle3d-runtime.test.ts` → `src/components/background/shape-3d/triangle/test/triangle3d-runtime.test.ts`

### Modify external references only

- `src/App.vue`: point the existing component import at the relocated arrow.
- `src/components.d.ts`: update the generated component path.
- `src/assets/css/test/common-background.test.ts`: read the relocated component.
- `src/HANDOFF-reusable-3d-shapes-2026-07-15.md`: update current implementation paths; leave historical specs/plans unchanged.

### Create

- `src/components/background/shape-3d/config/glyph3d.config.ts`: fixed glyph contract and developer-facing values.
- `src/components/background/shape-3d/config/index.ts`: centralized discovery/re-export entry.
- `src/components/background/shape-3d/config/glyph3d.config.test.ts`: config contract and arrow re-export protection.
- `src/components/background/shape-3d/glyph/outlines/{rounded,display,serif}-dollar.svg`: cleaned fill-only outlines.
- `src/components/background/shape-3d/glyph/outlines/OFL.txt`: license texts for all three font sources.
- `src/components/background/shape-3d/glyph/outlines/README.md`: pinned provenance and offline construction rules.
- `src/components/background/shape-3d/glyph/glyph3d-outline.ts`: style registry, SVG parsing, validation, and fallback extraction.
- `src/components/background/shape-3d/glyph/glyph3d.ts`: normalization, extrusion, materials, cap-only lines, ownership/disposal.
- `src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts`: asset/parser/topology/fallback failures.
- `src/components/background/shape-3d/glyph/test/glyph3d.test.ts`: geometry/material/outline/disposal behavior.
- `src/components/background/shape-3d/glyph/preview/index.html`: isolated comparison document.
- `src/components/background/shape-3d/glyph/preview/main.ts`: side-by-side WebGL preview.
- `src/components/background/shape-3d/glyph/test/glyph3d-preview.test.ts`: isolation and preview source contract.

---

## Appendix A: Exact Task 3 procedure for licensed outline assets

This is reference material only at this point in the document. Execute its checkboxes only when reaching the Task 3 checkpoint after Tasks 1 and 2; glyph work must not begin before the arrow-move checkpoint passes.

**Files:**

- Create: `src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts`
- Create: `src/components/background/shape-3d/glyph/outlines/rounded-dollar.svg`
- Create: `src/components/background/shape-3d/glyph/outlines/display-dollar.svg`
- Create: `src/components/background/shape-3d/glyph/outlines/serif-dollar.svg`
- Create: `src/components/background/shape-3d/glyph/outlines/OFL.txt`
- Create: `src/components/background/shape-3d/glyph/outlines/README.md`
- Create temporarily, then delete: `scripts/generate-glyph-outlines.py`

- [ ] **Step 1: Write the failing asset contract test**

Create `src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import displaySvg from '../outlines/display-dollar.svg?raw';
import roundedSvg from '../outlines/rounded-dollar.svg?raw';
import serifSvg from '../outlines/serif-dollar.svg?raw';

const assets = {
  display: displaySvg,
  rounded: roundedSvg,
  serif: serifSvg,
} as const;

describe('fixed glyph outline assets', () => {
  it.each(Object.entries(assets))('%s is a self-contained fill-only SVG outline', (_style, svg) => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = document.documentElement;
    const paths = [...root.querySelectorAll('path')];

    expect(root.tagName.toLowerCase()).toBe('svg');
    expect(root.getAttribute('viewBox')).toMatch(/^0 0 \d+(?:\.\d+)? \d+(?:\.\d+)?$/);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => Boolean(path.getAttribute('d')?.trim()))).toBe(true);
    expect(root.querySelector('text, style, mask, filter, image, use')).toBeNull();
    expect(root.querySelector('[stroke]')).toBeNull();
    expect(svg).not.toMatch(/(?:\.ttf|\.otf|\.woff|font-family)/i);
  });

  it('records all sources, weights, the fixed character, and license text', () => {
    const directory = join(process.cwd(), 'src/components/background/shape-3d/glyph/outlines');
    const readme = readFileSync(join(directory, 'README.md'), 'utf8');
    const license = readFileSync(join(directory, 'OFL.txt'), 'utf8');

    expect(readme).toContain('Nunito ExtraBold 800');
    expect(readme).toContain('Anton Regular');
    expect(readme).toContain('Libre Baskerville Bold 700');
    expect(readme).toContain('01848217e069afd63f72175b9b075ad9e07b8df8');
    expect(readme).toContain('fixed glyph: `$`');
    expect(readme).toContain('two rounded vertical bars');
    expect(license.match(/SIL OPEN FONT LICENSE Version 1\.1/g)?.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test and confirm the three imports are missing**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts
```

Expected: FAIL because the three SVG assets do not exist.

- [ ] **Step 3: Add the one-off pinned generator**

Create `scripts/generate-glyph-outlines.py` with this complete content:

```py
from __future__ import annotations

import shutil
from pathlib import Path
from urllib.request import urlopen

import pathops
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/components/background/shape-3d/glyph/outlines"
TEMP = ROOT / ".tmp-glyph-fonts"
GOOGLE_FONTS_COMMIT = "01848217e069afd63f72175b9b075ad9e07b8df8"
RAW = f"https://raw.githubusercontent.com/google/fonts/{GOOGLE_FONTS_COMMIT}/"

SOURCES = {
    "nunito": {
        "font": "ofl/nunito/Nunito%5Bwght%5D.ttf",
        "license": "ofl/nunito/OFL.txt",
    },
    "anton": {
        "font": "ofl/anton/Anton-Regular.ttf",
        "license": "ofl/anton/OFL.txt",
    },
    "libre-baskerville": {
        "font": "ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf",
        "license": "ofl/librebaskerville/OFL.txt",
    },
}


def download(relative_url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(urlopen(RAW + relative_url, timeout=30).read())


def get_font(path: Path, weight: int | None = None) -> TTFont:
    font = TTFont(path)
    if weight is not None and "fvar" in font:
        font = instantiateVariableFont(font, {"wght": weight}, inplace=False)
    return font


def get_glyph_path(font: TTFont, character: str) -> pathops.Path:
    glyph_name = font.getBestCmap().get(ord(character))
    if glyph_name is None:
        raise RuntimeError(f"font does not contain {character!r}")
    result = pathops.Path()
    font.getGlyphSet()[glyph_name].draw(result.getPen())
    result.simplify(fix_winding=True, keep_starting_points=True)
    return result


def bounds_of(path: pathops.Path) -> tuple[float, float, float, float]:
    pen = BoundsPen(None)
    path.draw(pen)
    if pen.bounds is None:
        raise RuntimeError("outline has no finite bounds")
    return pen.bounds


def add_rounded_rect(path: pathops.Path, x0: float, y0: float, x1: float, y1: float, radius: float) -> None:
    kappa = 0.5522847498307936
    pen = path.getPen()
    pen.moveTo((x0 + radius, y0))
    pen.lineTo((x1 - radius, y0))
    pen.curveTo((x1 - radius + kappa * radius, y0), (x1, y0 + radius - kappa * radius), (x1, y0 + radius))
    pen.lineTo((x1, y1 - radius))
    pen.curveTo((x1, y1 - radius + kappa * radius), (x1 - radius + kappa * radius, y1), (x1 - radius, y1))
    pen.lineTo((x0 + radius, y1))
    pen.curveTo((x0 + radius - kappa * radius, y1), (x0, y1 - radius + kappa * radius), (x0, y1 - radius))
    pen.lineTo((x0, y0 + radius))
    pen.curveTo((x0, y0 + radius - kappa * radius), (x0 + radius - kappa * radius, y0), (x0 + radius, y0))
    pen.closePath()


def create_display_path(font: TTFont) -> pathops.Path:
    path = get_glyph_path(font, "S")
    min_x, min_y, max_x, max_y = bounds_of(path)
    width = max_x - min_x
    height = max_y - min_y
    bar_width = width * 0.085
    bar_radius = bar_width / 2
    center_x = (min_x + max_x) / 2
    center_gap = bar_width * 1.8
    y0 = min_y - height * 0.08
    y1 = max_y + height * 0.08

    for bar_center in (center_x - center_gap / 2, center_x + center_gap / 2):
        add_rounded_rect(path, bar_center - bar_width / 2, y0, bar_center + bar_width / 2, y1, bar_radius)

    path.simplify(fix_winding=True, keep_starting_points=True)
    return path


def number(value: float) -> str:
    rounded = round(value, 3)
    return str(int(rounded)) if rounded.is_integer() else f"{rounded:.3f}".rstrip("0").rstrip(".")


def write_svg(name: str, path: pathops.Path) -> None:
    min_x, min_y, max_x, max_y = bounds_of(path)
    width = max_x - min_x
    height = max_y - min_y
    if width <= 0 or height <= 0:
        raise RuntimeError(f"{name} has zero-area bounds")

    pen = SVGPathPen(None)
    path.draw(TransformPen(pen, Transform(1, 0, 0, -1, -min_x, max_y)))
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {number(width)} {number(height)}">\n'
        f'  <path fill="#000" d="{pen.getCommands()}"/>\n'
        "</svg>\n"
    )
    (OUTPUT / name).write_text(svg, encoding="utf-8")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    TEMP.mkdir(parents=True, exist_ok=True)
    try:
        downloaded: dict[str, dict[str, Path]] = {}
        for family, source in SOURCES.items():
            font_path = TEMP / f"{family}.ttf"
            license_path = TEMP / f"{family}-OFL.txt"
            download(source["font"], font_path)
            download(source["license"], license_path)
            downloaded[family] = {"font": font_path, "license": license_path}

        nunito = get_font(downloaded["nunito"]["font"], 800)
        anton = get_font(downloaded["anton"]["font"])
        libre = get_font(downloaded["libre-baskerville"]["font"], 700)
        try:
            write_svg("rounded-dollar.svg", get_glyph_path(nunito, "$"))
            write_svg("display-dollar.svg", create_display_path(anton))
            write_svg("serif-dollar.svg", get_glyph_path(libre, "$"))
        finally:
            nunito.close()
            anton.close()
            libre.close()

        license_sections = []
        for title, family in (
            ("Nunito", "nunito"),
            ("Anton", "anton"),
            ("Libre Baskerville", "libre-baskerville"),
        ):
            text = downloaded[family]["license"].read_text(encoding="utf-8").strip()
            license_sections.append(f"===== {title} =====\n\n{text}")
        (OUTPUT / "OFL.txt").write_text("\n\n".join(license_sections) + "\n", encoding="utf-8")

        readme = f"""# Fixed `$` outline provenance

- generated: 2026-07-15
- fixed glyph: `$`
- Google Fonts commit: `{GOOGLE_FONTS_COMMIT}`
- rounded: Nunito ExtraBold 800, exported `$`
  - source: `https://github.com/google/fonts/blob/{GOOGLE_FONTS_COMMIT}/ofl/nunito/Nunito%5Bwght%5D.ttf`
- display: Anton Regular `S` plus two rounded vertical bars
  - source: `https://github.com/google/fonts/blob/{GOOGLE_FONTS_COMMIT}/ofl/anton/Anton-Regular.ttf`
- serif: Libre Baskerville Bold 700, exported `$`
  - source: `https://github.com/google/fonts/blob/{GOOGLE_FONTS_COMMIT}/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf`

Source font and OFL files came from the matching `ofl/<family>` directories at the pinned Google Fonts commit. Font binaries were used offline only and deleted after generation. All contours were simplified with Skia PathOps to merge overlaps, repair winding, and preserve holes. Runtime assets contain only fill paths with an explicit viewBox; no font is loaded in the browser.
"""
        (OUTPUT / "README.md").write_text(readme, encoding="utf-8")
    finally:
        shutil.rmtree(TEMP, ignore_errors=True)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Generate assets with pinned tools, then remove the one-off generator**

Run:

```bash
/opt/homebrew/bin/uv run \
  --with fonttools==4.63.0 \
  --with skia-pathops==0.9.2 \
  python scripts/generate-glyph-outlines.py
```

Expected: the three SVG files, `OFL.txt`, and `README.md` exist; `.tmp-glyph-fonts` does not.

Inspect the generated files:

```bash
ls -lh src/components/background/shape-3d/glyph/outlines
rg -n "<(text|style|mask|filter|image|use)|stroke=|font-family|\.(ttf|otf|woff)" \
  src/components/background/shape-3d/glyph/outlines/*.svg
find . -maxdepth 2 -type f \( -name '*.ttf' -o -name '*.otf' -o -name '*.woff' -o -name '*.woff2' \) \
  -not -path './src/assets/font/*'
```

Expected: `rg` prints nothing; `find` reports no newly downloaded font files.

Delete `scripts/generate-glyph-outlines.py` with `apply_patch` (`*** Delete File`), because export tooling is explicitly not a maintained product surface.

- [ ] **Step 5: Run the asset test and static checks**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts
pnpm type-check
pnpm exec eslint src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts
git diff --check
```

Expected: the asset contract passes and every command exits 0.

- [ ] **Step 6: Commit only the durable runtime assets and contract test**

Run:

```bash
git status --short
git add src/components/background/shape-3d/glyph/outlines \
  src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts
git commit -m "feat(ui): add licensed glyph outline assets"
```

Expected: no generator, font binary, temp directory, or `.superpowers/` file is staged.

---

## Task 1: Relocate the accepted arrow with byte-level protection

**Files:**

- Move: `src/components/background/triangle-3d/**` → `src/components/background/shape-3d/triangle/**`
- Modify: `src/App.vue`
- Modify: `src/components.d.ts`
- Modify: `src/assets/css/test/common-background.test.ts`
- Modify: `src/HANDOFF-reusable-3d-shapes-2026-07-15.md`
- Create temporarily, then delete: `/tmp/coderx-triangle-before.sha256`, `/tmp/coderx-triangle-after.sha256`

- [ ] **Step 1: Record the clean baseline and current arrow hashes**

Run:

```bash
git status --short
find src/components/background/triangle-3d -type f -print0 \
  | sort -z \
  | xargs -0 shasum -a 256 \
  | sed 's#src/components/background/triangle-3d/#triangle/#' \
  > /tmp/coderx-triangle-before.sha256
cat /tmp/coderx-triangle-before.sha256
```

Expected: `git status --short` is empty. The hash file lists exactly six files.

- [ ] **Step 2: Run the pre-move characterization suite**

Run:

```bash
pnpm exec vitest run \
  src/components/background/triangle-3d/test/triangle3d.test.ts \
  src/components/background/triangle-3d/test/triangle3d-runtime.test.ts \
  src/components/background/triangle-3d/test/BackgroundTriangle3D.test.ts \
  src/assets/css/test/common-background.test.ts
pnpm type-check
pnpm build-only
```

Expected: all focused tests pass, `vue-tsc` exits 0, and Vite finishes a production build.

- [ ] **Step 3: Move the directory as one Git-aware operation**

Run:

```bash
mkdir -p src/components/background/shape-3d
git mv src/components/background/triangle-3d src/components/background/shape-3d/triangle
```

Expected: Git reports the six files under the new path as renames after external references are updated.

- [ ] **Step 4: Update only the four classes of external current-state references**

Apply these exact replacements:

```diff
--- a/src/App.vue
+++ b/src/App.vue
@@
-import BackgroundTriangle3D from '@/components/background/triangle-3d/BackgroundTriangle3D.vue';
+import BackgroundTriangle3D from '@/components/background/shape-3d/triangle/BackgroundTriangle3D.vue';
```

```diff
--- a/src/components.d.ts
+++ b/src/components.d.ts
@@
-    BackgroundTriangle3D: typeof import('./components/background/triangle-3d/BackgroundTriangle3D.vue')['default']
+    BackgroundTriangle3D: typeof import('./components/background/shape-3d/triangle/BackgroundTriangle3D.vue')['default']
```

```diff
--- a/src/assets/css/test/common-background.test.ts
+++ b/src/assets/css/test/common-background.test.ts
@@
-const backgroundTrianglePath = join(process.cwd(), 'src/components/background/triangle-3d/BackgroundTriangle3D.vue');
+const backgroundTrianglePath = join(process.cwd(), 'src/components/background/shape-3d/triangle/BackgroundTriangle3D.vue');
```

In `src/HANDOFF-reusable-3d-shapes-2026-07-15.md`, replace every current implementation occurrence of:

```text
src/components/background/triangle-3d/
```

with:

```text
src/components/background/shape-3d/triangle/
```

Do not edit files under `docs/superpowers/specs/` or `docs/superpowers/plans/` as part of this move.

- [ ] **Step 5: Prove all six moved files are byte-identical**

Run:

```bash
find src/components/background/shape-3d/triangle -type f -print0 \
  | sort -z \
  | xargs -0 shasum -a 256 \
  | sed 's#src/components/background/shape-3d/triangle/#triangle/#' \
  > /tmp/coderx-triangle-after.sha256
diff -u /tmp/coderx-triangle-before.sha256 /tmp/coderx-triangle-after.sha256
git diff --summary --find-renames=100% -- src/components/background
rg -n "components/background/triangle-3d" src src/HANDOFF-reusable-3d-shapes-2026-07-15.md
```

Expected: `diff` and `rg` print nothing; `git diff --summary` shows six `rename ... (100%)` entries.

- [ ] **Step 6: Run the post-move protection suite**

Run:

```bash
pnpm exec vitest run \
  src/components/background/shape-3d/triangle/test/triangle3d.test.ts \
  src/components/background/shape-3d/triangle/test/triangle3d-runtime.test.ts \
  src/components/background/shape-3d/triangle/test/BackgroundTriangle3D.test.ts \
  src/assets/css/test/common-background.test.ts
pnpm type-check
pnpm build-only
git diff --check
```

Expected: identical behavioral coverage passes at the new paths; all other commands exit 0.

- [ ] **Step 7: Commit the isolated move**

Run:

```bash
rm /tmp/coderx-triangle-before.sha256 /tmp/coderx-triangle-after.sha256
git add src/App.vue src/components.d.ts src/assets/css/test/common-background.test.ts \
  src/HANDOFF-reusable-3d-shapes-2026-07-15.md src/components/background/shape-3d/triangle
git commit -m "refactor(ui): group 3d background shapes"
```

Expected: one commit containing six 100% renames and only the approved external path edits.

---

## Task 2: Establish the centralized, type-safe glyph config contract

**Files:**

- Create: `src/components/background/shape-3d/config/glyph3d.config.test.ts`
- Create: `src/components/background/shape-3d/config/glyph3d.config.ts`
- Create: `src/components/background/shape-3d/config/index.ts`

- [ ] **Step 1: Write the failing configuration contract test**

Create `src/components/background/shape-3d/config/glyph3d.config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TRIANGLE_SHAPE_CONFIG as directTriangleConfig } from '../triangle/triangle3d';
import { FIXED_GLYPH, GLYPH_3D_CONFIG, TRIANGLE_SHAPE_CONFIG } from './index';

describe('shape 3d configuration entry', () => {
  it('fixes the runtime glyph and exposes all developer-selectable defaults', () => {
    expect(FIXED_GLYPH).toBe('$');
    expect(GLYPH_3D_CONFIG).toEqual({
      outlineStyle: 'rounded',
      targetHeight: 112,
      depth: 24,
      curveSegments: 16,
      bodyColor: '#f8cbc6',
      outlineColor: '#f7aaa3',
      capOpacity: 0.28,
      sideOpacity: 0.26,
      outlineOpacity: 0.42,
      outlineWidth: 1,
      roughness: 0.95,
      metalness: 0,
    });
  });

  it('re-exports the accepted arrow config without creating a second source of truth', () => {
    expect(TRIANGLE_SHAPE_CONFIG).toBe(directTriangleConfig);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails for the missing config module**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/config/glyph3d.config.test.ts
```

Expected: FAIL because `./index` does not exist. A syntax or environment failure is not the expected red state.

- [ ] **Step 3: Add the exact developer-facing config and style union**

Create `src/components/background/shape-3d/config/glyph3d.config.ts`:

```ts
export type GlyphOutlineStyle = 'rounded' | 'display' | 'serif';

export interface Glyph3DConfig {
  outlineStyle: GlyphOutlineStyle;
  targetHeight: number;
  depth: number;
  curveSegments: number;
  bodyColor: string;
  outlineColor: string;
  capOpacity: number;
  sideOpacity: number;
  outlineOpacity: number;
  outlineWidth: number;
  roughness: number;
  metalness: number;
}

export const FIXED_GLYPH = '$' as const;

export const GLYPH_3D_CONFIG = {
  // Developer selection point: 'rounded' | 'display' | 'serif'.
  outlineStyle: 'rounded',
  targetHeight: 112,
  depth: 24,
  curveSegments: 16,
  bodyColor: '#f8cbc6',
  outlineColor: '#f7aaa3',
  capOpacity: 0.28,
  sideOpacity: 0.26,
  outlineOpacity: 0.42,
  outlineWidth: 1,
  roughness: 0.95,
  metalness: 0,
} as const satisfies Glyph3DConfig;
```

Create `src/components/background/shape-3d/config/index.ts`:

```ts
export { TRIANGLE_SHAPE_CONFIG } from '../triangle/triangle3d';
export { FIXED_GLYPH, GLYPH_3D_CONFIG } from './glyph3d.config';
export type { Glyph3DConfig, GlyphOutlineStyle } from './glyph3d.config';
```

- [ ] **Step 4: Run focused tests and static checks**

Run:

```bash
pnpm exec vitest run \
  src/components/background/shape-3d/config/glyph3d.config.test.ts \
  src/components/background/shape-3d/triangle/test/triangle3d.test.ts
pnpm type-check
pnpm exec eslint src/components/background/shape-3d/config
```

Expected: both suites pass and both static checks exit 0.

- [ ] **Step 5: Commit the configuration seam**

Run:

```bash
git add src/components/background/shape-3d/config
git commit -m "feat(ui): centralize 3d shape configuration"
```

Expected: the commit contains only the config contract, its test, and the arrow re-export.

---

## Task 3: Generate and verify the three licensed, runtime-font-free outline assets

**Files:** All files listed in [Appendix A](#appendix-a-exact-task-3-procedure-for-licensed-outline-assets).

- [ ] **Step 1: Confirm Tasks 1 and 2 are committed and the workspace is clean**

Run:

```bash
git status --short
git log -2 --oneline
```

Expected: status is empty; the two latest commits are the isolated arrow move and centralized config seam.

- [ ] **Step 2: Execute Appendix A Steps 1–6 in order**

Follow the exact test, pinned generator, inspection, cleanup, verification, and commit procedure in Appendix A. Do not retain the one-off Python script or any downloaded font binary.

- [ ] **Step 3: Reconfirm that production code cannot load a font**

Run:

```bash
rg -n "FontLoader|TextGeometry|\.ttf|\.otf|\.woff" src/components/background/shape-3d
git status --short
```

Expected: `rg` only finds license/provenance wording if present and no TypeScript runtime import; status is empty after the Task 3 commit.

---

## Task 4: Parse every outline through one validated SVG-to-Shape pipeline

**Files:**

- Create: `src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts`
- Create: `src/components/background/shape-3d/glyph/glyph3d-outline.ts`

- [ ] **Step 1: Write the failing parser, topology, fallback, and error tests**

Create `src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts`:

```ts
import { Box2, Vector2 } from 'three';
import { describe, expect, it } from 'vitest';
import type { GlyphOutlineStyle } from '../../config';
import displaySvg from '../outlines/display-dollar.svg?raw';
import roundedSvg from '../outlines/rounded-dollar.svg?raw';
import serifSvg from '../outlines/serif-dollar.svg?raw';
import { createGlyphShapes, getGlyphFallback, parseGlyphOutline } from '../glyph3d-outline';

const styles = ['rounded', 'display', 'serif'] as const satisfies readonly GlyphOutlineStyle[];
const assets = { display: displaySvg, rounded: roundedSvg, serif: serifSvg } as const;

function pointsFor(style: GlyphOutlineStyle) {
  return createGlyphShapes(style).flatMap((shape) => [
    ...shape.getPoints(24),
    ...shape.holes.flatMap((hole) => hole.getPoints(24)),
  ]);
}

describe('glyph svg outline parsing', () => {
  it.each(styles)('parses %s into finite, non-zero shapes', (style) => {
    const shapes = createGlyphShapes(style);
    const points = pointsFor(style);
    const bounds = new Box2().setFromPoints(points);
    const size = bounds.getSize(new Vector2());

    expect(shapes.length).toBeGreaterThan(0);
    expect(points.length).toBeGreaterThan(8);
    expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
  });

  it('preserves a synthetic hole without assuming the dollar itself has one', () => {
    const fixture = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path fill="#000" fill-rule="evenodd" d="M0 0H100V100H0Z M25 25V75H75V25Z"/>
      </svg>
    `;
    const parsed = parseGlyphOutline(fixture, 'synthetic-hole');

    expect(parsed.shapes).toHaveLength(1);
    expect(parsed.shapes[0]?.holes).toHaveLength(1);
    expect(parsed.fallback).toEqual({
      viewBox: '0 0 100 100',
      paths: ['M0 0H100V100H0Z M25 25V75H75V25Z'],
    });
  });

  it.each(styles)('derives the %s fallback from the selected source asset', (style) => {
    const source = new DOMParser().parseFromString(assets[style], 'image/svg+xml');
    const expectedPaths = [...source.querySelectorAll('path')].map((path) => path.getAttribute('d')!);

    expect(getGlyphFallback(style)).toEqual({
      viewBox: source.documentElement.getAttribute('viewBox'),
      paths: expectedPaths,
    });
  });

  it('rejects an untyped unsupported style with the value in the message', () => {
    expect(() => createGlyphShapes('marker' as GlyphOutlineStyle)).toThrow(/Unsupported glyph outline style "marker"/);
  });

  it.each([
    ['empty', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>', /empty did not produce any filled shapes/],
    [
      'zero-area',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0H10Z"/></svg>',
      /zero-area did not produce any filled shapes/,
    ],
    ['missing-viewbox', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0H10V10Z"/></svg>', /missing-viewbox has no valid viewBox/],
  ])('reports a clear validation error for %s', (name, svg, message) => {
    expect(() => parseGlyphOutline(svg, name)).toThrow(message);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails for the missing parser module**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts
```

Expected: FAIL because `../glyph3d-outline` does not exist.

- [ ] **Step 3: Implement the fixed registry and shared parser**

Create `src/components/background/shape-3d/glyph/glyph3d-outline.ts`:

```ts
import { Box2, Vector2, type Shape } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { GLYPH_3D_CONFIG, type GlyphOutlineStyle } from '../config';
import displaySvg from './outlines/display-dollar.svg?raw';
import roundedSvg from './outlines/rounded-dollar.svg?raw';
import serifSvg from './outlines/serif-dollar.svg?raw';

const OUTLINE_SVG = {
  display: displaySvg,
  rounded: roundedSvg,
  serif: serifSvg,
} as const satisfies Record<GlyphOutlineStyle, string>;

const OUTLINE_STYLES = new Set<GlyphOutlineStyle>(['rounded', 'display', 'serif']);

export interface GlyphFallbackDescriptor {
  viewBox: string;
  paths: readonly string[];
}

export interface ParsedGlyphOutline {
  shapes: Shape[];
  fallback: GlyphFallbackDescriptor;
}

export function isGlyphOutlineStyle(value: unknown): value is GlyphOutlineStyle {
  return typeof value === 'string' && OUTLINE_STYLES.has(value as GlyphOutlineStyle);
}

function collectPoints(shapes: readonly Shape[]) {
  return shapes.flatMap((shape) => [
    ...shape.getPoints(24),
    ...shape.holes.flatMap((hole) => hole.getPoints(24)),
  ]);
}

export function parseGlyphOutline(svg: string, sourceName: string): ParsedGlyphOutline {
  const result = new SVGLoader().parse(svg);
  const root = result.xml.documentElement;
  const viewBox = root.getAttribute('viewBox')?.trim();
  if (!viewBox || viewBox.split(/\s+/).length !== 4) {
    throw new Error(`[glyph3d] ${sourceName} has no valid viewBox`);
  }

  const paths = [...root.querySelectorAll('path')]
    .map((path) => path.getAttribute('d')?.trim())
    .filter((path): path is string => Boolean(path));
  const shapes = result.paths.flatMap((path) => path.toShapes());
  const points = collectPoints(shapes);
  if (shapes.length === 0 || points.length === 0) {
    throw new Error(`[glyph3d] ${sourceName} did not produce any filled shapes`);
  }
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    throw new Error(`[glyph3d] ${sourceName} produced non-finite outline coordinates`);
  }

  const size = new Box2().setFromPoints(points).getSize(new Vector2());
  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || size.x <= 0 || size.y <= 0) {
    throw new Error(`[glyph3d] ${sourceName} has zero-area outline bounds`);
  }

  return {
    shapes,
    fallback: { viewBox, paths },
  };
}

function svgFor(style: GlyphOutlineStyle) {
  if (!isGlyphOutlineStyle(style)) {
    throw new Error(`[glyph3d] Unsupported glyph outline style "${String(style)}"`);
  }
  return OUTLINE_SVG[style];
}

export function createGlyphShapes(style: GlyphOutlineStyle = GLYPH_3D_CONFIG.outlineStyle) {
  return parseGlyphOutline(svgFor(style), style).shapes;
}

export function getGlyphFallback(style: GlyphOutlineStyle = GLYPH_3D_CONFIG.outlineStyle) {
  return parseGlyphOutline(svgFor(style), style).fallback;
}
```

Implementation note: the only shape conversion call above is `path.toShapes()`. Do not replace it with `SVGLoader.createShapes()`.

- [ ] **Step 4: Run focused parser and asset tests**

Run:

```bash
pnpm exec vitest run \
  src/components/background/shape-3d/glyph/test/glyph3d-outline-assets.test.ts \
  src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts
pnpm type-check
pnpm exec eslint src/components/background/shape-3d/glyph/glyph3d-outline.ts \
  src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts
git diff --check
```

Expected: all parser/asset cases pass, including the synthetic hole and all three failure messages.

- [ ] **Step 5: Commit the parser boundary**

Run:

```bash
git add src/components/background/shape-3d/glyph/glyph3d-outline.ts \
  src/components/background/shape-3d/glyph/test/glyph3d-outline.test.ts
git commit -m "feat(ui): parse configurable glyph outlines"
```

Expected: one commit with one parser shared by all three styles.

---

## Task 5: Build the normalized 3D glyph object with independent materials and cap-only outlines

**Files:**

- Create: `src/components/background/shape-3d/glyph/test/glyph3d.test.ts`
- Create: `src/components/background/shape-3d/glyph/glyph3d.ts`

- [ ] **Step 1: Write the failing object-builder tests**

Create `src/components/background/shape-3d/glyph/test/glyph3d.test.ts`:

```ts
import { Box3, Color, ExtrudeGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { describe, expect, it, vi } from 'vitest';
import { GLYPH_3D_CONFIG, type GlyphOutlineStyle } from '../../config';
import { createGlyphObject } from '../glyph3d';

const styles = ['rounded', 'display', 'serif'] as const satisfies readonly GlyphOutlineStyle[];

function getParts(style: GlyphOutlineStyle = GLYPH_3D_CONFIG.outlineStyle) {
  const object = createGlyphObject({ ...GLYPH_3D_CONFIG, outlineStyle: style });
  const mesh = object.group.children.find((child) => child instanceof Mesh);
  const outline = object.group.children.find((child) => child instanceof LineSegments2);
  if (!mesh || !outline) throw new Error('glyph object is missing render parts');
  return { mesh, object, outline };
}

describe('glyph 3d object', () => {
  it.each(styles)('normalizes %s to one target height without scaling depth', (style) => {
    const { object } = getParts(style);
    const bounds = new Box3().setFromObject(object.group);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    expect(size.y).toBeCloseTo(GLYPH_3D_CONFIG.targetHeight, 4);
    expect(size.z).toBeCloseTo(GLYPH_3D_CONFIG.depth, 4);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
    expect(object.group.position.toArray()).toEqual([0, 0, 0]);
    expect(object.group.scale.y).toBe(-1);

    object.dispose();
  });

  it('uses glyph-owned visual values rather than importing arrow constants', () => {
    const { mesh, object } = getParts();
    const materials = Array.isArray(mesh.material) ? mesh.material : [];

    expect(materials).toHaveLength(2);
    expect(materials.every((material) => material instanceof MeshStandardMaterial)).toBe(true);
    expect(materials[0]?.color.getHexString()).toBe(new Color(GLYPH_3D_CONFIG.bodyColor).getHexString());
    expect(materials[1]?.color.getHexString()).toBe(new Color(GLYPH_3D_CONFIG.bodyColor).getHexString());
    expect(materials[0]?.opacity).toBe(GLYPH_3D_CONFIG.capOpacity);
    expect(materials[1]?.opacity).toBe(GLYPH_3D_CONFIG.sideOpacity);
    expect(materials[0]?.roughness).toBe(GLYPH_3D_CONFIG.roughness);
    expect(materials[1]?.metalness).toBe(GLYPH_3D_CONFIG.metalness);
    expect(object.outlineMaterial.color.getHexString()).toBe(new Color(GLYPH_3D_CONFIG.outlineColor).getHexString());
    expect(object.outlineMaterial.opacity).toBe(GLYPH_3D_CONFIG.outlineOpacity);
    expect(object.outlineMaterial.linewidth).toBe(GLYPH_3D_CONFIG.outlineWidth);

    object.dispose();
  });

  it('produces distinct finite geometry for all three outline selections', () => {
    const signatures = styles.map((style) => {
      const { mesh, object } = getParts(style);
      const position = mesh.geometry.getAttribute('position');
      const signature = `${position.count}:${Array.from(position.array)
        .slice(0, 24)
        .map((value) => Number(value).toFixed(3))
        .join(',')}`;
      expect(Array.from(position.array).every((value) => Number.isFinite(Number(value)))).toBe(true);
      object.dispose();
      return signature;
    });

    expect(new Set(signatures).size).toBe(3);
  });

  it('draws only front and back cap boundaries, never depth connectors', () => {
    const { object, outline } = getParts();
    const starts = outline.geometry.getAttribute('instanceStart');
    const ends = outline.geometry.getAttribute('instanceEnd');
    outline.geometry.computeBoundingBox();
    const size = outline.geometry.boundingBox?.getSize(new Vector3());

    expect(starts?.count).toBeGreaterThan(20);
    expect(size?.z).toBeCloseTo(GLYPH_3D_CONFIG.depth, 4);
    for (let index = 0; index < (starts?.count ?? 0); index += 1) {
      expect(starts?.getZ(index)).toBeCloseTo(ends?.getZ(index) ?? Number.NaN, 4);
    }

    object.dispose();
  });

  it('owns every GPU resource and makes dispose idempotent', () => {
    const { mesh, object, outline } = getParts();
    const resources = [
      mesh.geometry,
      ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]),
      outline.geometry,
      outline.material,
    ];
    const disposeSpies = resources.map((resource) => vi.spyOn(resource, 'dispose'));

    object.dispose();
    object.dispose();

    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it('releases resources created before a later construction failure', () => {
    const geometryDispose = vi.spyOn(ExtrudeGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(MeshStandardMaterial.prototype, 'dispose');
    const lineGeometryDispose = vi.spyOn(LineSegmentsGeometry.prototype, 'dispose');
    const setPositions = vi.spyOn(LineSegmentsGeometry.prototype, 'setPositions').mockImplementationOnce(() => {
      throw new Error('synthetic line failure');
    });

    try {
      expect(() => createGlyphObject()).toThrow('synthetic line failure');
      expect(geometryDispose).toHaveBeenCalledOnce();
      expect(materialDispose).toHaveBeenCalledTimes(2);
      expect(lineGeometryDispose).toHaveBeenCalledOnce();
    } finally {
      setPositions.mockRestore();
      lineGeometryDispose.mockRestore();
      materialDispose.mockRestore();
      geometryDispose.mockRestore();
    }
  });

  it('rejects invalid runtime dimensions before allocating render resources', () => {
    expect(() => createGlyphObject({ ...GLYPH_3D_CONFIG, targetHeight: 0 })).toThrow(/targetHeight must be finite and greater than zero/);
    expect(() => createGlyphObject({ ...GLYPH_3D_CONFIG, depth: Number.NaN })).toThrow(/depth must be finite and greater than zero/);
  });

  it('uses the expected Three.js line material implementation', () => {
    const { object } = getParts();
    expect(object.outlineMaterial).toBeInstanceOf(LineMaterial);
    object.dispose();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails for the missing builder**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test/glyph3d.test.ts
```

Expected: FAIL because `../glyph3d` does not exist.

- [ ] **Step 3: Implement normalization, extrusion, materials, cap outlines, and cleanup**

Create `src/components/background/shape-3d/glyph/glyph3d.ts`:

```ts
import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { GLYPH_3D_CONFIG, type Glyph3DConfig } from '../config';
import { createGlyphShapes } from './glyph3d-outline';

export { createGlyphShapes, getGlyphFallback } from './glyph3d-outline';
export type { GlyphFallbackDescriptor } from './glyph3d-outline';

export interface GlyphObject {
  group: Group;
  outlineMaterial: LineMaterial;
  dispose: () => void;
}

type Disposable = { dispose: () => void };
type Position = [x: number, y: number, z: number];

function assertPositiveFinite(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`[glyph3d] ${name} must be finite and greater than zero`);
  }
}

function validateConfig(config: Glyph3DConfig) {
  assertPositiveFinite('targetHeight', config.targetHeight);
  assertPositiveFinite('depth', config.depth);
  assertPositiveFinite('curveSegments', config.curveSegments);
}

function positionKey([x, y, z]: Position) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}

function createOutlinePositions(geometry: ExtrudeGeometry) {
  const position = geometry.getAttribute('position');
  const zLevels = new Map<string, number>();
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index);
    zLevels.set(z.toFixed(4), z);
  }
  const sortedZLevels = [...zLevels.values()].sort((a, b) => a - b);
  const capLevels = [sortedZLevels.at(0), sortedZLevels.at(-1)].filter(
    (z, index, levels): z is number => z !== undefined && levels.indexOf(z) === index,
  );
  const positions: number[] = [];

  for (const capZ of capLevels) {
    const edges = new Map<string, { count: number; end: Position; start: Position }>();
    for (let index = 0; index < position.count; index += 3) {
      const triangle: Position[] = [0, 1, 2].map((offset) => [
        position.getX(index + offset),
        position.getY(index + offset),
        position.getZ(index + offset),
      ]);
      if (!triangle.every((point) => Math.abs(point[2] - capZ) < 0.0001)) continue;

      for (const [startIndex, endIndex] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ] as const) {
        const start = triangle[startIndex]!;
        const end = triangle[endIndex]!;
        const key = [positionKey(start), positionKey(end)].sort().join('|');
        const edge = edges.get(key);
        if (edge) edge.count += 1;
        else edges.set(key, { count: 1, end, start });
      }
    }
    edges.forEach((edge) => {
      if (edge.count === 1) positions.push(...edge.start, ...edge.end);
    });
  }

  return positions;
}

function normalizeGeometry(geometry: ExtrudeGeometry, config: Glyph3DConfig) {
  const position = geometry.getAttribute('position');
  if (position.count === 0) throw new Error('[glyph3d] extrusion did not produce any vertices');
  for (let index = 0; index < position.count; index += 1) {
    if (![position.getX(index), position.getY(index), position.getZ(index)].every(Number.isFinite)) {
      throw new Error('[glyph3d] extrusion produced non-finite vertices');
    }
  }

  geometry.computeBoundingBox();
  const initial = geometry.boundingBox;
  if (!initial) throw new Error('[glyph3d] extrusion has no bounding box');
  const height = initial.max.y - initial.min.y;
  assertPositiveFinite('outline height', height);
  const xyScale = config.targetHeight / height;
  geometry.scale(xyScale, xyScale, 1);

  geometry.computeBoundingBox();
  const scaled = geometry.boundingBox;
  if (!scaled) throw new Error('[glyph3d] scaled extrusion has no bounding box');
  geometry.translate(
    -(scaled.min.x + scaled.max.x) / 2,
    -(scaled.min.y + scaled.max.y) / 2,
    -(scaled.min.z + scaled.max.z) / 2,
  );
  geometry.computeBoundingBox();
}

export function createGlyphObject(config: Glyph3DConfig = GLYPH_3D_CONFIG): GlyphObject {
  validateConfig(config);
  const disposables: Disposable[] = [];

  try {
    const geometry = new ExtrudeGeometry(createGlyphShapes(config.outlineStyle), {
      bevelEnabled: false,
      curveSegments: config.curveSegments,
      depth: config.depth,
      steps: 1,
    });
    disposables.push(geometry);
    normalizeGeometry(geometry, config);

    const capMaterial = new MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness,
      opacity: config.capOpacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      roughness: config.roughness,
      transparent: true,
    });
    disposables.push(capMaterial);
    const sideMaterial = new MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness,
      opacity: config.sideOpacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      roughness: config.roughness,
      transparent: true,
    });
    disposables.push(sideMaterial);
    const mesh = new Mesh(geometry, [capMaterial, sideMaterial]);

    const lineGeometry = new LineSegmentsGeometry();
    disposables.push(lineGeometry);
    lineGeometry.setPositions(createOutlinePositions(geometry));
    const outlineMaterial = new LineMaterial({
      color: config.outlineColor,
      linewidth: config.outlineWidth,
      opacity: config.outlineOpacity,
      transparent: true,
      worldUnits: false,
    });
    disposables.push(outlineMaterial);
    const outline = new LineSegments2(lineGeometry, outlineMaterial);

    const group = new Group();
    // SVG coordinates point downward; a group-level mirror keeps triangle winding/material faces intact.
    group.scale.y = -1;
    group.add(mesh, outline);

    let disposed = false;
    return {
      group,
      outlineMaterial,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        disposables.forEach((resource) => resource.dispose());
      },
    };
  } catch (error) {
    disposables.reverse().forEach((resource) => resource.dispose());
    throw error;
  }
}
```

- [ ] **Step 4: Run the builder tests and the whole glyph suite**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test
pnpm type-check
pnpm exec eslint src/components/background/shape-3d/glyph/glyph3d.ts \
  src/components/background/shape-3d/glyph/test/glyph3d.test.ts
git diff --check
```

Expected: all glyph tests pass; every style is `112` high and `24` deep; type/lint/diff checks exit 0.

- [ ] **Step 5: Re-run the untouched arrow protection suite before committing**

Run:

```bash
pnpm exec vitest run \
  src/components/background/shape-3d/triangle/test/triangle3d.test.ts \
  src/components/background/shape-3d/triangle/test/triangle3d-runtime.test.ts \
  src/components/background/shape-3d/triangle/test/BackgroundTriangle3D.test.ts \
  src/assets/css/test/common-background.test.ts
```

Expected: every arrow/background contract still passes unchanged.

- [ ] **Step 6: Commit the independent glyph builder**

Run:

```bash
git add src/components/background/shape-3d/glyph/glyph3d.ts \
  src/components/background/shape-3d/glyph/test/glyph3d.test.ts
git commit -m "feat(ui): build reusable 3d glyph objects"
```

Expected: the commit touches no arrow file and adds no `shared/` directory.

---

## Task 6: Add an isolated three-style Vite comparison preview

**Files:**

- Create: `src/components/background/shape-3d/glyph/test/glyph3d-preview.test.ts`
- Create: `src/components/background/shape-3d/glyph/preview/index.html`
- Create: `src/components/background/shape-3d/glyph/preview/main.ts`

- [ ] **Step 1: Write the failing production-isolation and preview contract test**

Create `src/components/background/shape-3d/glyph/test/glyph3d-preview.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('glyph comparison preview boundary', () => {
  it('has a dedicated entry that constructs every style through the shared builder', () => {
    const html = read('src/components/background/shape-3d/glyph/preview/index.html');
    const main = read('src/components/background/shape-3d/glyph/preview/main.ts');

    expect(html).toMatch(/<script type="module" src="\.\/main\.ts"><\/script>/);
    expect(main).toMatch(/createGlyphObject/);
    expect(main).toMatch(/\['rounded', 'display', 'serif'\]/);
    expect(main).toMatch(/GLYPH_3D_CONFIG\.outlineStyle/);
    expect(main).not.toMatch(/FontLoader|TextGeometry|\.ttf|\.otf|\.woff/);
  });

  it('is not mounted or imported by the production application', () => {
    const app = read('src/App.vue');
    const productionHtml = read('index.html');
    const arrowComponent = read('src/components/background/shape-3d/triangle/BackgroundTriangle3D.vue');
    const arrowModel = read('src/components/background/shape-3d/triangle/triangle3d.ts');
    const arrowRuntime = read('src/components/background/shape-3d/triangle/triangle3d-runtime.ts');

    expect(app).not.toMatch(/shape-3d\/glyph/);
    expect(productionHtml).not.toMatch(/glyph\/preview/);
    expect(arrowComponent).not.toMatch(/shape-3d\/glyph|glyph3d/);
    expect(arrowModel).not.toMatch(/shape-3d\/glyph|glyph3d/);
    expect(arrowRuntime).not.toMatch(/shape-3d\/glyph|glyph3d/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails for the missing preview files**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test/glyph3d-preview.test.ts
```

Expected: FAIL with `ENOENT` for the preview entry.

- [ ] **Step 3: Create the self-contained comparison document**

Create `src/components/background/shape-3d/glyph/preview/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>固定字符 $ · 三种 3D 轮廓对比</title>
    <style>
      :root {
        color: #f5f2ef;
        background: #1a1a1e;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { min-width: 320px; margin: 0; background: #1a1a1e; }
      main { width: min(1440px, 100%); margin: 0 auto; padding: 40px 28px 48px; }
      header { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
      h1 { margin: 0 0 8px; font-size: clamp(24px, 3vw, 40px); letter-spacing: -0.04em; }
      p { margin: 0; color: #a6a3a2; line-height: 1.6; }
      .current { flex: none; color: #f7aaa3; font-family: ui-monospace, monospace; }
      .stage { position: relative; height: min(62vh, 620px); min-height: 420px; overflow: hidden; border: 1px solid #3d3b3f; border-radius: 24px; background: #29292c; }
      canvas { display: block; width: 100%; height: 100%; }
      .labels { position: absolute; inset: auto 24px 22px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; pointer-events: none; }
      .card { padding: 12px 14px; border: 1px solid #454247; border-radius: 12px; background: rgb(27 27 30 / 82%); backdrop-filter: blur(12px); }
      .card[data-current='true'] { border-color: #f7aaa3; }
      .card strong { display: block; margin-bottom: 4px; font-size: 14px; }
      .card span { color: #9c999c; font-size: 12px; }
      @media (max-width: 720px) {
        main { padding: 24px 16px 32px; }
        header { align-items: start; flex-direction: column; }
        .stage { min-height: 540px; }
        .labels { inset: auto 12px 12px; grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>固定字符 $ · 三种 3D 轮廓</h1>
          <p>同一深度、材质、描边与旋转，用于比较轮廓本身。</p>
        </div>
        <p class="current">当前配置：<strong data-current-style></strong></p>
      </header>
      <section class="stage" data-stage>
        <div class="labels" aria-hidden="true">
          <div class="card" data-style="rounded"><strong>A · 圆润几何</strong><span>Nunito ExtraBold 800</span></div>
          <div class="card" data-style="display"><strong>B · 醒目展示</strong><span>Anton S + 双圆头竖线</span></div>
          <div class="card" data-style="serif"><strong>C · 衬线编辑感</strong><span>Libre Baskerville Bold 700</span></div>
        </div>
      </section>
    </main>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Render all three styles through `createGlyphObject()`**

Create `src/components/background/shape-3d/glyph/preview/main.ts`:

```ts
import {
  AmbientLight,
  DirectionalLight,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { GLYPH_3D_CONFIG, type GlyphOutlineStyle } from '../../config';
import { createGlyphObject } from '../glyph3d';

const styles = ['rounded', 'display', 'serif'] as const satisfies readonly GlyphOutlineStyle[];
const stage = document.querySelector<HTMLElement>('[data-stage]');
const currentStyle = document.querySelector<HTMLElement>('[data-current-style]');
if (!stage || !currentStyle) throw new Error('glyph preview DOM is incomplete');

currentStyle.textContent = GLYPH_3D_CONFIG.outlineStyle;
document.querySelector(`[data-style="${GLYPH_3D_CONFIG.outlineStyle}"]`)?.setAttribute('data-current', 'true');

const renderer = new WebGLRenderer({ alpha: true, antialias: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
stage.prepend(renderer.domElement);

const scene = new Scene();
scene.add(new AmbientLight(0xffffff, 1.8));
const keyLight = new DirectionalLight(0xffffff, 3.2);
keyLight.position.set(-180, 220, 260);
scene.add(keyLight);
const fillLight = new DirectionalLight(0xf7aaa3, 1.1);
fillLight.position.set(220, -80, 120);
scene.add(fillLight);

const camera = new OrthographicCamera(-240, 240, 150, -150, 1, 1_200);
camera.position.set(0, 0, 440);
camera.lookAt(0, 0, 0);

const objects = styles.map((outlineStyle, index) => {
  const object = createGlyphObject({ ...GLYPH_3D_CONFIG, outlineStyle });
  scene.add(object.group);
  return { index, object };
});

function resize() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const stacked = width < 720;
  const halfHeight = stacked ? 230 : 155;
  const halfWidth = halfHeight * (width / height);
  objects.forEach(({ index, object }) => {
    object.group.position.set(stacked ? 0 : (index - 1) * 165, stacked ? (1 - index) * 130 : 0, 0);
  });
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  objects.forEach(({ object }) => object.outlineMaterial.resolution.set(width, height));
}

const startedAt = performance.now();
renderer.setAnimationLoop((time) => {
  const elapsed = Math.max(0, time - startedAt) / 1_000;
  for (const { object } of objects) {
    object.group.rotation.set(0.22 + elapsed * 0.16, -0.28 + elapsed * 0.24, elapsed * 0.09);
  }
  renderer.render(scene, camera);
});

resize();
window.addEventListener('resize', resize);
window.addEventListener(
  'beforeunload',
  () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    objects.forEach(({ object }) => object.dispose());
    renderer.dispose();
  },
  { once: true },
);
```

- [ ] **Step 5: Run the preview contract, glyph suite, type check, and lint**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test
pnpm type-check
pnpm exec eslint src/components/background/shape-3d/glyph
git diff --check
```

Expected: all glyph suites pass and all static checks exit 0.

- [ ] **Step 6: Start the isolated preview and visually inspect it**

Run in a persistent terminal:

```bash
pnpm exec vite --host 127.0.0.1 --port 59595
```

Open:

```text
http://127.0.0.1:59595/src/components/background/shape-3d/glyph/preview/
```

Use the in-app browser control skill to inspect both a desktop viewport and a narrow viewport. Expected:

- exactly three `$` objects are visible and labeled `rounded`, `display`, `serif`;
- all use the same color, depth, outlines, light, camera, and rotation;
- the `display` version has two rounded vertical bars without broken cap triangles;
- the serif details remain intact during side rotation;
- each outline follows both caps with no front-to-back connector;
- the current config card is highlighted;
- no glyph is added to the main application at `/`.

Stop the Vite process after inspection.

- [ ] **Step 7: Commit the development-only preview**

Run:

```bash
git add src/components/background/shape-3d/glyph/preview \
  src/components/background/shape-3d/glyph/test/glyph3d-preview.test.ts
git commit -m "feat(ui): add 3d glyph comparison preview"
```

Expected: no `package.json`, production `index.html`, route, `App.vue`, or arrow file appears in this commit.

---

## Task 7: Perform the complete regression, isolation, and plan-compliance audit

**Files:** No planned source changes. If a check fails, return to the owning task, add or correct its test first, and make a separate fix commit.

- [ ] **Step 1: Verify the final directory and forbidden surfaces**

Run:

```bash
find src/components/background/shape-3d -maxdepth 4 -type f | sort
test ! -e src/components/background/triangle-3d
test ! -e src/components/background/shape-3d/shared
rg -n "shape-3d/glyph|glyph3d" \
  src/App.vue \
  src/components/background/shape-3d/triangle/BackgroundTriangle3D.vue \
  src/components/background/shape-3d/triangle/triangle3d.ts \
  src/components/background/shape-3d/triangle/triangle3d-runtime.ts
rg -n "SVGLoader\.createShapes|FontLoader|TextGeometry" src/components/background/shape-3d
```

Expected: both `test` commands exit 0; both `rg` commands print nothing. The file list matches the design, plus the focused test files added by this plan.

- [ ] **Step 2: Reprove arrow source identity against the move commit's parent**

Run:

```bash
MOVE_COMMIT=$(git log --format='%H' --grep='^refactor(ui): group 3d background shapes$' -1)
test -n "$MOVE_COMMIT"
for file in BackgroundTriangle3D.vue triangle3d.ts triangle3d-runtime.ts \
  test/BackgroundTriangle3D.test.ts test/triangle3d.test.ts test/triangle3d-runtime.test.ts; do
  test "$(git show "$MOVE_COMMIT^:src/components/background/triangle-3d/$file" | shasum -a 256 | cut -d' ' -f1)" = \
       "$(shasum -a 256 "src/components/background/shape-3d/triangle/$file" | cut -d' ' -f1)" || exit 1
done
```

Expected: the loop exits 0, proving no glyph task edited the accepted arrow files.

- [ ] **Step 3: Run focused glyph and arrow suites**

Run:

```bash
pnpm exec vitest run src/components/background/shape-3d/glyph/test
pnpm exec vitest run \
  src/components/background/shape-3d/triangle/test/triangle3d.test.ts \
  src/components/background/shape-3d/triangle/test/triangle3d-runtime.test.ts \
  src/components/background/shape-3d/triangle/test/BackgroundTriangle3D.test.ts \
  src/assets/css/test/common-background.test.ts
```

Expected: all focused glyph, arrow, Vue fallback, runtime, and background-layer tests pass.

- [ ] **Step 4: Run repository-wide verification**

Run:

```bash
pnpm exec vitest run
pnpm type-check
pnpm exec eslint src/components/background/shape-3d src/App.vue src/assets/css/test/common-background.test.ts
pnpm build
git diff --check
git status --short
```

Expected: every command exits 0 and final status is empty. The production build must not list a separate glyph preview entry or a font asset introduced by this work.

- [ ] **Step 5: Review the implementation against every design acceptance item**

Confirm explicitly:

- `$` is fixed and no runtime character input API exists.
- `GLYPH_3D_CONFIG.outlineStyle` is the sole developer selection point.
- all three style assets share parser, normalization, extrusion, materials, cap outlines, fallback, and disposal.
- default glyph visuals equal the approved values but import no arrow visual constant.
- fallback `viewBox` and paths come from the selected source SVG.
- a synthetic hole fixture passes.
- object origin is local and contains no page placement, orbit, or spin.
- preview is development-only and the production app still mounts exactly one arrow component.
- arrow file hashes remain identical.

Expected: every item is backed by an automated test or command result above; no unresolved marker, placeholder asset, or skipped test remains.

---

## Final Handoff

Report the exact commit list, focused/full verification results, and the preview URL. State clearly that the glyph is deliberately not mounted in `App.vue` and that the arrow's six files remain byte-identical. Do not propose extracting `shared/` until this implementation has been visually accepted and both shapes have remained stable.
