import { beforeEach, describe, expect, it, vi } from 'vitest';

function installMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    installMatchMedia(false);
  });

  it('syncs the native color scheme when the theme mode changes', async () => {
    const { initThemeOnLoad, useTheme } = await import('../useTheme');

    initThemeOnLoad();
    expect(document.documentElement.style.colorScheme).toBe('light');

    const { setMode } = useTheme();
    setMode('dark');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    setMode('light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('uses the system dark color scheme before a stored preference exists', async () => {
    installMatchMedia(true);
    const { initThemeOnLoad } = await import('../useTheme');

    initThemeOnLoad();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
