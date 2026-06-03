import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const commonScss = readFileSync(join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');

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
});
