import { describe, expect, it } from 'vitest';
import { CODERX_ROLE_WORDS, DEFAULT_SCRAMBLE_PRESET, SCRAMBLE_PRESETS } from '..';

describe('scramble constants', () => {
  it('exports the default CoderX role words in display order', () => {
    expect(CODERX_ROLE_WORDS).toEqual(['Coder', 'Writer', 'Creator', 'Builder']);
  });

  it('uses the pixel block preset by default', () => {
    expect(DEFAULT_SCRAMBLE_PRESET).toBe('pixelBlocks');
    expect(SCRAMBLE_PRESETS.pixelBlocks).toMatchObject({
      chars: 'blocks',
      from: 'left',
      duration: 900,
      ease: 'easeOutCubic',
      renderMode: 'cells',
    });
  });

  it('exposes alternate terminal and braille styles', () => {
    expect(Object.keys(SCRAMBLE_PRESETS)).toEqual(['pixelBlocks', 'terminalBinary', 'softBraille']);
  });
});
