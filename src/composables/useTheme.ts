import { computed, ref } from 'vue';

/** 主题模式类型 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 默认主题模式。
 *
 * 约定：
 * - 用户首次访问（localStorage 无记录）时使用该值，并不写入 localStorage，
 *   即"沉默跟随系统"，用户修改系统亮/暗偏好时能实时响应。
 * - 只有当用户主动调用 setMode / toggleDark（或按 D 快捷键）后，才会把选择
 *   持久化到 localStorage；此后即使系统偏好改变，站点也不再自动跟随，
 *   直到用户显式切回 'system'。
 */
const DEFAULT_THEME_MODE: ThemeMode = 'system';
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/** localStorage 存储键名 */
const STORAGE_KEY = 'coderx-theme';

/** 用户主动切换主题时使用的全局过渡配置。 */
const THEME_TRANSITION_CLASS = 'theme-transitioning';
const THEME_TRANSITION_DURATION_MS = 300;
const THEME_TRANSITION_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** 主题模式引用 - 在模块级别定义，实现单例模式 */
const mode = ref<ThemeMode>(DEFAULT_THEME_MODE);

/** 系统主题是否为深色 */
const systemDark = ref(false);

/** 是否已初始化 */
let initialized = false;
let systemThemeListenerBound = false;
let storageListenerBound = false;
let keyboardListenerBound = false;
let mediaQuery: MediaQueryList | null = null;
let themeTransitionTimer: ReturnType<typeof window.setTimeout> | null = null;

/** 快捷键配置：按下该键可在 light / dark 间切换 */
const TOGGLE_SHORTCUT_KEY = 'd';

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

/**
 * 读取存储中的主题模式；若无记录或非法，回退到 DEFAULT_THEME_MODE。
 * 回退结果**不会**被写回 localStorage —— 这是"首次访问默认跟随系统、
 * 但在用户未主动切换之前保持无持久化状态"的关键前提。
 */
function getStoredThemeMode(): ThemeMode {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  return isThemeMode(savedTheme) ? savedTheme : DEFAULT_THEME_MODE;
}

function applyTheme() {
  const nextColorScheme = isDark.value ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', isDark.value);
  document.documentElement.style.colorScheme = nextColorScheme;
}

/**
 * 清理主题渐变的临时状态。
 */
function finishThemeTransition() {
  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer);
    themeTransitionTimer = null;
  }
  document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * 为一次用户主动主题切换开启全局颜色渐变。
 *
 * 时长与缓动由这里统一写入 CSS 变量，样式层只消费变量，
 * 避免 TypeScript 清理时间和 SCSS 动画时间各自维护。
 */
function beginThemeTransition() {
  finishThemeTransition();

  const root = document.documentElement;
  root.style.setProperty('--theme-transition-duration', `${THEME_TRANSITION_DURATION_MS}ms`);
  root.style.setProperty('--theme-transition-easing', THEME_TRANSITION_EASING);

  if (prefersReducedMotion()) {
    return;
  }

  root.classList.add(THEME_TRANSITION_CLASS);
  // 确保浏览器先解析过渡规则，再切换 dark class。
  void root.offsetWidth;

  themeTransitionTimer = window.setTimeout(() => {
    finishThemeTransition();
  }, THEME_TRANSITION_DURATION_MS);
}

function persistTheme() {
  localStorage.setItem(STORAGE_KEY, mode.value);
}

/**
 * 应用并持久化主题 —— 仅在「用户主动切换」路径上调用（setMode / toggleDark / D 键）。
 *
 * ⚠️ 初始化路径请勿走此函数，否则会把默认值 'system' 写进 localStorage，
 *    破坏"首次访问不持久化、静默跟随系统"的约定，导致用户此后系统偏好
 *    变化时站点不再自动响应。
 */
function syncTheme(newMode: ThemeMode, options: { animate?: boolean } = {}) {
  if (options.animate) {
    beginThemeTransition();
  } else {
    finishThemeTransition();
  }
  mode.value = newMode;
  applyTheme();
  persistTheme();
}

/** 判断事件目标是否是可编辑元素，避免在输入框中按 d 被拦截 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * 在 light / dark 之间切换：
 * - 当前 dark   → light
 * - 当前 light  → dark
 * - 当前 system → 切换到与系统当前呈现相反的主题（与 shadcn 参考实现一致）
 */
function toggleDark() {
  let nextMode: ThemeMode;
  if (mode.value === 'dark') {
    nextMode = 'light';
  } else if (mode.value === 'light') {
    nextMode = 'dark';
  } else {
    nextMode = systemDark.value ? 'light' : 'dark';
  }
  syncTheme(nextMode, { animate: true });
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  systemDark.value = event.matches;

  // 仅当 mode === 'system'（包括首次访问的默认态）时才跟随系统变化；
  // 用户一旦主动选择了 light / dark，就"冻结"在用户选择上，不再自动切换。
  if (mode.value === 'system') {
    finishThemeTransition();
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
  finishThemeTransition();
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

function handleKeyDown(event: KeyboardEvent) {
  if (event.repeat) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() !== TOGGLE_SHORTCUT_KEY) return;
  if (isEditableTarget(event.target)) return;
  toggleDark();
}

function setupKeyboardThemeListener() {
  if (keyboardListenerBound) {
    return;
  }

  window.addEventListener('keydown', handleKeyDown);
  keyboardListenerBound = true;
}

function ensureThemeInitialized() {
  if (initialized) {
    return;
  }

  // 读取已有偏好；若无则沉默回退到 'system'（不写入 localStorage）
  mode.value = getStoredThemeMode();
  // 先挂 system 监听，再应用一次主题。
  // 这样当 mode === 'system' 时，isDark 能拿到真实 systemDark，避免首帧色彩错位。
  setupSystemThemeListener();
  setupStorageThemeListener();
  setupKeyboardThemeListener();
  // 仅 applyTheme，不 persist —— 保持"用户未主动切换前不落盘"的默认契约，
  // 后续系统偏好变化由 handleSystemThemeChange 实时响应。
  applyTheme();
  initialized = true;
}

/**
 * 主题切换 Composable，支持 light / dark / system 三种模式。
 *
 * ### 持久化契约
 * - **首次访问**：默认使用 'system'，**不**写入 localStorage，页面静默跟随系统偏好。
 * - **用户主动切换**（调用 setMode / toggleDark，或按 D 键）后才写入 localStorage；
 *   此后即使系统偏好变化，也不会再自动跟随，除非用户显式切回 'system'。
 * - 多标签页之间通过 `storage` 事件保持同步。
 *
 * @example
 * ```ts
 * const { mode, isDark, setMode, toggleDark } = useTheme()
 *
 * setMode('dark')     // 显式选择深色并持久化
 * toggleDark()        // 在 light / dark 之间切换（与 D 快捷键等价）
 * if (isDark.value) { /* ... *\/ }
 * ```
 */
export function useTheme() {
  ensureThemeInitialized();

  /**
   * 设置主题模式
   * @param newMode - 新的主题模式
   */
  const setMode = (newMode: ThemeMode) => {
    syncTheme(newMode, { animate: true });
  };

  return {
    /** 当前主题模式（'light' | 'dark' | 'system'） */
    mode: computed(() => mode.value),
    /** 实际是否为深色模式 */
    isDark,
    /** 设置主题模式 */
    setMode,
    /** 在 light / dark 之间切换（与 `d` 快捷键行为一致） */
    toggleDark,
  };
}

/**
 * 在应用启动时立即初始化主题,避免页面闪烁（FOUC）
 */
export function initThemeOnLoad() {
  ensureThemeInitialized();
}
