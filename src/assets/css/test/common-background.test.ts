import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const commonScss = readFileSync(join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');
const appVue = readFileSync(join(process.cwd(), 'src/App.vue'), 'utf8');

function getRuleBody(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm').exec(commonScss)?.[1] ?? '';
}

describe('global background layering', () => {
  it('keeps the body transparent so the app SVG background layer remains visible', () => {
    const htmlRule = getRuleBody('html');
    const bodyRule = getRuleBody('body');

    expect(htmlRule).toMatch(/background-color:\s*var\(--bg-color-primary\)/);
    expect(bodyRule).not.toMatch(/background(?:-color)?:/);
  });

  it('layers theme-aware paper grain above the existing animated SVG background', () => {
    expect(commonScss).toMatch(/--bg:\s*url\(['"]?@\/assets\/img\/bg\.svg['"]?\)\s+center\/cover\s+no-repeat\s+fixed/);
    expect(appVue).toMatch(/&::before\s*\{[\s\S]*?background:\s*var\(--bg\)/);
    expect(appVue).toMatch(/&::after\s*\{[\s\S]*?background-image:\s*var\(--paper-noise\)/);

    expect(commonScss).toMatch(/--paper-noise:\s*url\(['"]?@\/assets\/img\/paper-noise\.svg['"]?\)/);
    expect(commonScss).toMatch(/--paper-noise-opacity:\s*0\.\d+/);
    expect(commonScss).toMatch(/html\.dark\s*\{[\s\S]*?--paper-noise-opacity:\s*0\.\d+/);
    expect(commonScss).toMatch(/html\.dark\s*\{[\s\S]*?--paper-noise-filter:\s*invert\(1\)/);
  });
});
