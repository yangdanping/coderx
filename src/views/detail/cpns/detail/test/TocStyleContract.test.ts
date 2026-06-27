import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const tocSources = [
  'src/views/detail/cpns/detail/DetailToc.vue',
  'src/views/home/cpns/features/demos/ArticleTocDemo.vue',
];

const tocLightAccentColor = '#81c995';
const tocDarkAccentColor = '#c0e0c7';

describe('table of contents visual style contract', () => {
  it('uses the shared moving slider treatment in detail and homepage demo tocs', () => {
    for (const path of tocSources) {
      const source = readSource(path);

      expect(source, path).toContain('toc-active-slider');
      expect(source, path).toMatch(new RegExp(`--toc-accent-color:\\s*${tocLightAccentColor};`));
      expect(source, path).toMatch(new RegExp(`:where\\(html\\.dark\\)[\\s\\S]*--toc-accent-color:\\s*${tocDarkAccentColor};`));
      expect(source, path).toContain('--toc-active-y');
      expect(source, path).toContain('transform: translate3d(0, var(--toc-active-y), 0)');
      expect(source, path).toMatch(/\.toc-active-slider[\s\S]*border-radius:\s*0/);
      expect(source, path).toMatch(/\.toc-active-slider\s*\{[^}]*background:\s*var\(--toc-accent-color\);/);
      expect(source, path).not.toMatch(/\.toc-active-slider\s*\{[^}]*background:\s*linear-gradient/);
      expect(source, path).not.toMatch(/\.toc-active-slider\s*\{[^}]*box-shadow:/);
      expect(source, path).toContain('transition:');
      expect(source, path).toContain('prefers-reduced-motion');
    }
  });

  it('uses a readable slider green for active text and a quieter grey for inactive text', () => {
    for (const path of tocSources) {
      const source = readSource(path);

      expect(source, path).toMatch(/&\.active\s*\{[^}]*color:\s*var\(--toc-accent-color\);/);
      expect(source, path).not.toMatch(/&\.active\s*\{[^}]*color:\s*#c0e0c7;/);
      expect(source, path).not.toMatch(/&\.active\s*\{[^}]*color:\s*var\(--el-color-primary\)/);
      expect(source, path).toMatch(/color:\s*var\(--toc-muted-color\)/);
    }
  });

  it('keeps toc hover states from creating horizontal overflow', () => {
    const detailSource = readSource('src/views/detail/cpns/detail/DetailToc.vue');
    const demoSource = readSource('src/views/home/cpns/features/demos/ArticleTocDemo.vue');

    expect(detailSource).toMatch(/\.toc-desktop\s*\{[\s\S]*overflow-x:\s*hidden;/);
    expect(detailSource).toMatch(/\.toc-list-shell\s*\{[\s\S]*overflow-x:\s*hidden;/);
    expect(demoSource).toMatch(/&__toc\s*\{[\s\S]*overflow-x:\s*hidden;/);
    expect(demoSource).toMatch(/&__toc-track\s*\{[\s\S]*overflow-x:\s*hidden;/);

    for (const path of tocSources) {
      const source = readSource(path);

      expect(source, path).not.toContain('transform: translateX(2px)');
    }
  });

  it('removes the old rounded active background block from both toc variants', () => {
    for (const path of tocSources) {
      const source = readSource(path);

      expect(source, path).not.toMatch(/background-color:\s*var\(--el-color-primary-light-9\)/);
      expect(source, path).not.toMatch(/&\.active\s*\{[\s\S]*?border-radius:\s*4px/);
    }
  });
});
