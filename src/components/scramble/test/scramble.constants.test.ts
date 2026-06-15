import { describe, expect, it } from 'vitest';
import { CODERX_ROLE_TITLES, CODERX_ROLE_WORDS, DEFAULT_SCRAMBLE_PRESET, getRandomScrambleChars, SCRAMBLE_CHARSETS, SCRAMBLE_PRESETS } from '..';

describe('scramble constants', () => {
  it('exports the default CoderX role words in display order', () => {
    expect(CODERX_ROLE_WORDS).toEqual(['Coder', 'Writer', 'Creator', 'Builder']);
    expect(CODERX_ROLE_TITLES).toEqual(['CoderX', 'WriterX', 'CreatorX', 'BuilderX']);
  });

  it('exposes the retained random character sets', () => {
    expect(SCRAMBLE_CHARSETS).toEqual(['braille', 'katakana', 'binary', 'lowercase', 'symbols']);
    expect(getRandomScrambleChars(undefined, () => 0)).toBe('braille');
    expect(getRandomScrambleChars(undefined, () => 0.999999)).toBe('symbols');
  });

  it('avoids repeating the previous character set', () => {
    expect(getRandomScrambleChars('braille', () => 0)).toBe('katakana');
  });

  it('keeps the selected animation preset independent from random chars', () => {
    expect(DEFAULT_SCRAMBLE_PRESET).toBe('pixelBlocks');
    expect(SCRAMBLE_PRESETS.pixelBlocks).toMatchObject({
      from: 'left',
      duration: 800,
      ease: 'easeOutCubic',
      renderMode: 'cells',
    });
  });

  it('exposes alternate terminal and braille styles', () => {
    expect(Object.keys(SCRAMBLE_PRESETS)).toEqual(['pixelBlocks', 'terminalBinary', 'softBraille']);
  });
});
