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
