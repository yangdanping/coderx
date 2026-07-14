import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readBgSvg = () => readFileSync(join(process.cwd(), 'src/assets/img/bg.svg'), 'utf8');

describe('home background SVG contract', () => {
  it('keeps the top-left blue circle shifted away from the logo rail', () => {
    const source = readBgSvg();
    const blueCircle = source.match(/<circle class="item-style" cx="(?<cx>-?\d+)" cy="90" r="30" stroke="rgba\(26, 115, 232\)"/);

    expect(blueCircle?.groups?.cx).toBe('-20');
  });

  it('moves only the pink triangle out of the SVG background', () => {
    const source = readBgSvg();

    expect(source).not.toContain('rgb(243, 178, 172)');
    expect(source).toContain('rgba(26, 115, 232)');
    expect(source).toContain('rgba(190, 224, 198)');
    expect(source).toContain('rgba(253, 214, 99)');
  });
});
