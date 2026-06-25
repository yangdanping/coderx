import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function installMatchMedia(options: { systemDark?: boolean; reducedMotion?: boolean } = {}) {
  const { systemDark = false, reducedMotion = false } = options;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const matches = query === '(prefers-color-scheme: dark)' ? systemDark : query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false;

      return {
        matches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    installMatchMedia();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
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
    installMatchMedia({ systemDark: true });
    const { initThemeOnLoad } = await import('../useTheme');

    initThemeOnLoad();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('adds a centrally configured transition class for an explicit theme change', async () => {
    const { initThemeOnLoad, useTheme } = await import('../useTheme');
    initThemeOnLoad();

    const { setMode } = useTheme();
    setMode('dark');

    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--theme-transition-duration')).toBe('300ms');
    expect(document.documentElement.style.getPropertyValue('--theme-transition-easing')).toBe('cubic-bezier(0.65, 0, 0.35, 1)');

    vi.advanceTimersByTime(299);
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
  });

  it('restarts transition cleanup when the theme is toggled repeatedly', async () => {
    const { initThemeOnLoad, useTheme } = await import('../useTheme');
    initThemeOnLoad();

    const { setMode, toggleDark } = useTheme();
    setMode('dark');
    vi.advanceTimersByTime(200);

    toggleDark();
    vi.advanceTimersByTime(100);
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);

    vi.advanceTimersByTime(200);
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
  });

  it('keeps initialization immediate', async () => {
    const { initThemeOnLoad } = await import('../useTheme');

    initThemeOnLoad();

    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
  });

  it('skips theme interpolation when reduced motion is requested', async () => {
    installMatchMedia({ reducedMotion: true });
    const { initThemeOnLoad, useTheme } = await import('../useTheme');
    initThemeOnLoad();

    const { setMode } = useTheme();
    setMode('dark');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
  });

  it('cancels a user transition when a cross-tab theme update arrives', async () => {
    const { initThemeOnLoad, useTheme } = await import('../useTheme');
    initThemeOnLoad();

    const { setMode } = useTheme();
    setMode('dark');
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);

    const storageEvent = new Event('storage');
    Object.defineProperties(storageEvent, {
      key: { value: 'coderx-theme' },
      newValue: { value: 'light' },
      storageArea: { value: localStorage },
    });
    window.dispatchEvent(storageEvent);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
  });
});
