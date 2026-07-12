import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveBaseUrl } from '../config';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('request environment config', () => {
  it('falls back to the Vite dev API proxy when VITE_BASE_URL is absent in development', () => {
    expect(resolveBaseUrl(undefined, true)).toBe('/dev-api');
  });

  it('falls back to the production API proxy outside development', () => {
    expect(resolveBaseUrl(undefined, false)).toBe('/api');
  });

  it('keeps an explicit VITE_BASE_URL when provided', () => {
    expect(resolveBaseUrl('/custom-api', true)).toBe('/custom-api');
  });

  it('lets the dev API proxy target be pointed at the local backend without touching app code', () => {
    const viteConfigSource = readSource('vite.config.ts');

    expect(viteConfigSource).toContain('VITE_DEV_API_TARGET');
    expect(viteConfigSource).toContain('target: devApiTarget');
  });
});
