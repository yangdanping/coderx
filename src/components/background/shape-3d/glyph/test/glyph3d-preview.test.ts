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

  it('has structural narrow-screen layout and resizes every render dependency', () => {
    const html = read('src/components/background/shape-3d/glyph/preview/index.html');
    const main = read('src/components/background/shape-3d/glyph/preview/main.ts');

    expect(html).toMatch(/@media \(max-width: 720px\)/);
    expect(html).toMatch(/grid-template-columns: 1fr/);
    expect(main).toMatch(/const stacked = window\.matchMedia\('\(max-width: 720px\)'\)\.matches/);
    expect(main).toMatch(/object\.group\.position\.set\(stacked/);
    expect(main).toMatch(/const desktopMinHalfWidth = desktopSpacing \+ GLYPH_3D_CONFIG\.targetHeight/);
    expect(main).toMatch(/const halfHeight = stacked \? 230 : Math\.max\(155, desktopMinHalfWidth \/ aspect\)/);
    expect(main).toMatch(/const halfWidth = halfHeight \* aspect/);
    expect(main).toMatch(/camera\.updateProjectionMatrix\(\)/);
    expect(main).toMatch(/renderer\.setSize\(width, height, false\)/);
    expect(main).toMatch(/outlineMaterial\.resolution\.set\(width, height\)/);
  });

  it('uses a stable pose instead of continuous rotation when reduced motion is preferred', () => {
    const main = read('src/components/background/shape-3d/glyph/preview/main.ts');

    expect(main).toMatch(/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
    expect(main).toMatch(/if \(reduceMotion\.matches\)/);
    expect(main).toMatch(/renderStablePose\(\)/);
    expect(main).toMatch(/else \{[\s\S]*?renderer\.setAnimationLoop/);
  });

  it('releases animation, listeners, glyphs, and renderer before unload', () => {
    const main = read('src/components/background/shape-3d/glyph/preview/main.ts');

    expect(main).toMatch(/beforeunload/);
    expect(main).toMatch(/renderer\.setAnimationLoop\(null\)/);
    expect(main).toMatch(/removeEventListener\('resize', resize\)/);
    expect(main).toMatch(/reduceMotion\.removeEventListener\('change', configureMotion\)/);
    expect(main).toMatch(/object\.dispose\(\)/);
    expect(main).toMatch(/renderer\.dispose\(\)/);
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
