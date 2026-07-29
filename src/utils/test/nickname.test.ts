import { describe, expect, it } from 'vitest';
import { getDisplayName, NICKNAME_MAX_LENGTH, normalizeNickname, validateNickname } from '../nickname';

const INVALID_NICKNAME_MESSAGE = '昵称须为 1-30 个字符，且不能包含换行或控制字符';

describe('nickname utilities', () => {
  it('normalizes missing, blank, and padded values', () => {
    expect(normalizeNickname()).toBe('');
    expect(normalizeNickname(null)).toBe('');
    expect(normalizeNickname(' \t ')).toBe('');
    expect(normalizeNickname('  小杨  ')).toBe('小杨');
  });

  it('uses nickname as display name and falls back to account name', () => {
    expect(getDisplayName({ name: 'ydp', nickname: '小杨' })).toBe('小杨');
    expect(getDisplayName({ name: 'ydp', nickname: '   ' })).toBe('ydp');
    expect(getDisplayName({ name: 'ydp' })).toBe('ydp');
    expect(getDisplayName({})).toBe('用户');
  });

  it('accepts Unicode text and emoji up to 30 code points', () => {
    const maxNickname = '杨'.repeat(28) + '🙂🙂';

    expect(Array.from(maxNickname)).toHaveLength(NICKNAME_MAX_LENGTH);
    expect(validateNickname(maxNickname)).toBeNull();
    expect(validateNickname('Coder X 🙂')).toBeNull();
    expect(validateNickname('')).toBeNull();
  });

  it('rejects overlong values, control characters, and line separators', () => {
    expect(validateNickname('🙂'.repeat(31))).toBe(INVALID_NICKNAME_MESSAGE);

    for (const value of ['hello\nworld', 'hello\u0000world', 'hello\u0085world', 'hello\u2028world', 'hello\u2029world']) {
      expect(validateNickname(value)).toBe(INVALID_NICKNAME_MESSAGE);
    }
  });

  it('rejects non-string values instead of coercing them', () => {
    for (const value of [1, true, {}, []]) {
      expect(validateNickname(value)).toBe(INVALID_NICKNAME_MESSAGE);
    }
  });
});
