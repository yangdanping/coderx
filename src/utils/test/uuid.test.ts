import { describe, expect, it, vi } from 'vitest';

import { createUuidV4 } from '../uuid';

describe('createUuidV4', () => {
  it('uses the browser native implementation when it is available', () => {
    const nativeUuid = '11111111-1111-4111-8111-111111111111';
    const randomUUID = vi.fn(() => nativeUuid);
    const getRandomValues = vi.fn();

    expect(createUuidV4({ randomUUID, getRandomValues })).toBe(nativeUuid);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('creates an RFC 4122 UUID v4 when randomUUID is unavailable on plain HTTP', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      return bytes;
    });

    expect(createUuidV4({ getRandomValues })).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
