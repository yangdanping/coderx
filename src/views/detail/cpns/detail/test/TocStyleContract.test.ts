import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const detailSource = readSource('src/views/detail/cpns/detail/DetailToc.vue');
const demoSource = readSource('src/views/home/cpns/features/demos/ArticleTocDemo.vue');

const tocLightAccentColor = '#81c995';
const tocDarkAccentColor = '#c0e0c7';

describe('article detail table of contents visual contract', () => {
  it('uses a collapsed rail and a bounded expanded panel', () => {
    expect(detailSource).toContain('toc-rail-toggle');
    expect(detailSource).toContain('toc-rail__tick');
    expect(detailSource).toContain('toc-panel');
    expect(detailSource).toMatch(/\.toc-rail\s*\{[\s\S]*height:\s*clamp\(132px,\s*24vh,\s*220px\)/);
    expect(detailSource).toMatch(/\.toc-panel\s*\{[\s\S]*width:\s*220px/);
    expect(detailSource).toMatch(/\.toc-list-shell\s*\{[\s\S]*max-height:\s*min\(60vh,\s*520px\)/);
  });

  it('keeps long inactive titles compact and gives the active title two lines', () => {
    expect(detailSource).toMatch(/\.toc-link\s*\{[\s\S]*text-overflow:\s*ellipsis/);
    expect(detailSource).toMatch(/\.toc-item\.active\s+\.toc-link\s*\{[\s\S]*-webkit-line-clamp:\s*2/);
    expect(detailSource).toContain('overflow-wrap: anywhere');
  });

  it('keeps readable light and dark accent colors', () => {
    expect(detailSource).toMatch(new RegExp(`--toc-accent-color:\\s*${tocLightAccentColor};`));
    expect(detailSource).toMatch(new RegExp(`:where\\(html\\.dark\\)[\\s\\S]*--toc-accent-color:\\s*${tocDarkAccentColor};`));
    expect(detailSource).toMatch(/\.toc-item\.active[\s\S]*color:\s*var\(--toc-accent-color\)/);
  });

  it('removes fixed-height slider math from the detail page', () => {
    expect(detailSource).not.toContain('TOC_ITEM_HEIGHT');
    expect(detailSource).not.toContain('--toc-active-y');
    expect(detailSource).not.toContain('toc-active-slider');
  });

  it('uses compositor-friendly motion with a reduced-motion fallback', () => {
    expect(detailSource).toMatch(/\.toc-panel\s*\{[\s\S]*transform:\s*translate3d\(-8px,\s*0,\s*0\)/);
    expect(detailSource).toMatch(/\.toc-desktop\.is-expanded\s+\.toc-panel\s*\{[\s\S]*transform:\s*translate3d\(0,\s*0,\s*0\)/);
    expect(detailSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(detailSource).not.toMatch(/transition:[^;]*(width|max-height|height)/);
  });

  it('keeps keyboard focus visible without outlining the full-height rail', () => {
    expect(detailSource).toMatch(/\.toc-rail-toggle\s*\{[\s\S]*&:focus-visible\s*\{[\s\S]*outline:\s*0/);
    expect(detailSource).toContain('&:focus-visible .toc-rail__tick.active');
    expect(detailSource).toMatch(/&:focus-visible \.toc-rail__tick\.active\s*\{[\s\S]*box-shadow:/);
  });
});

describe('homepage article TOC demo visual contract', () => {
  it('retains its self-contained moving slider demonstration', () => {
    expect(demoSource).toContain('toc-active-slider');
    expect(demoSource).toContain('--toc-active-y');
    expect(demoSource).toContain('transform: translate3d(0, var(--toc-active-y), 0)');
    expect(demoSource).toMatch(new RegExp(`--toc-accent-color:\\s*${tocLightAccentColor};`));
    expect(demoSource).toMatch(new RegExp(`:where\\(html\\.dark\\)[\\s\\S]*--toc-accent-color:\\s*${tocDarkAccentColor};`));
    expect(demoSource).toContain('prefers-reduced-motion');
  });
});
