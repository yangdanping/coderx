import { computed, ref } from 'vue';

/** 主题模式类型 */
export type ThemeMode = 'light' | 'dark' | 'system';

const DEFAULT_THEME_MODE: ThemeMode = 'system';
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/** localStorage 存储键名 */
const STORAGE_KEY = 'coderx-theme';

/** 主题模式引用 - 在模块级别定义，实现单例模式 */
const mode = ref<ThemeMode>(DEFAULT_THEME_MODE);

/** 系统主题是否为深色 */
const systemDark = ref(false);

/** 是否已初始化 */
let initialized = false;
let systemThemeListenerBound = false;
let storageListenerBound = false;
let mediaQuery: MediaQueryList | null = null;

/**
 * 计算实际是否为深色模式
 * - mode 为 'dark' 时，始终为深色
 * - mode 为 'light' 时，始终为浅色
 * - mode 为 'system' 时，跟随系统设置
 */
const isDark = computed(() => {
  if (mode.value === 'dark') return true;
  if (mode.value === 'light') return false;
  return systemDark.value;
});

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

function getStoredThemeMode(): ThemeMode {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  return isThemeMode(savedTheme) ? savedTheme : DEFAULT_THEME_MODE;
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value);
}

function persistTheme() {
  localStorage.setItem(STORAGE_KEY, mode.value);
}

function syncTheme(newMode: ThemeMode) {
  mode.value = newMode;
  applyTheme();
  persistTheme();
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  systemDark.value = event.matches;

  if (mode.value === 'system') {
    applyTheme();
  }
}

function handleStorageChange(event: StorageEvent) {
  if (event.storageArea !== localStorage) {
    return;
  }

  if (event.key !== STORAGE_KEY) {
    return;
  }

  mode.value = isThemeMode(event.newValue) ? event.newValue : DEFAULT_THEME_MODE;
  applyTheme();
}

function setupSystemThemeListener() {
  if (systemThemeListenerBound) {
    return;
  }

  mediaQuery ??= window.matchMedia('(prefers-color-scheme: dark)');
  systemDark.value = mediaQuery.matches;
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  systemThemeListenerBound = true;
}

function setupStorageThemeListener() {
  if (storageListenerBound) {
    return;
  }

  window.addEventListener('storage', handleStorageChange);
  storageListenerBound = true;
}

function ensureThemeInitialized() {
  if (initialized) {
    return;
  }

  mode.value = getStoredThemeMode();
  setupSystemThemeListener();
  setupStorageThemeListener();
  applyTheme();
  initialized = true;
}

/**
 * 主题切换 Composable
 * 支持 light/dark/system 三种模式
 *
 * @example
 * ```ts
 * const { mode, isDark, setMode } = useTheme()
 *
 * // 切换主题
 * setMode('dark')
 *
 * // 判断当前是否为深色模式
 * if (isDark.value) {
 *   console.log('当前为深色模式')
 * }
 * ```
 */
export function useTheme() {
  ensureThemeInitialized();

  /**
   * 设置主题模式
   * @param newMode - 新的主题模式
   */
  const setMode = (newMode: ThemeMode) => {
    syncTheme(newMode);
  };

  return {
    /** 当前主题模式（'light' | 'dark' | 'system'） */
    mode: computed(() => mode.value),
    /** 实际是否为深色模式 */
    isDark,
    /** 设置主题模式 */
    setMode,
  };
}

/**
 * 在应用启动时立即初始化主题,避免页面闪烁（FOUC）
 */
export function initThemeOnLoad() {
  ensureThemeInitialized();
}
