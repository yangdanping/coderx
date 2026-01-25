import { ref, computed, watchEffect, onMounted } from 'vue';

/** 主题模式类型 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** localStorage 存储键名 */
const STORAGE_KEY = 'coderx-theme';

/** 主题模式引用 - 在模块级别定义，实现单例模式 */
const mode = ref<ThemeMode>('system');

/** 系统主题是否为深色 */
const systemDark = ref(false);

/** 是否已初始化 */
let initialized = false;

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
  /**
   * 初始化主题（仅执行一次）
   */
  const initTheme = () => {
    if (initialized) return;
    initialized = true;

    // 从 localStorage 读取保存的主题设置
    const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      mode.value = savedTheme;
    }

    // 检测系统主题
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemDark.value = mediaQuery.matches;

    // 监听系统主题变化
    mediaQuery.addEventListener('change', (e) => {
      systemDark.value = e.matches;
    });
  };

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

  /**
   * 设置主题模式
   * @param newMode - 新的主题模式
   */
  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode;
  };

  // 监听主题变化，更新 DOM 和 localStorage
  watchEffect(() => {
    // 切换 html.dark class
    document.documentElement.classList.toggle('dark', isDark.value);
    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, mode.value);
  });

  // 组件挂载时初始化
  onMounted(() => {
    initTheme();
  });

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
 * 在应用启动时立即初始化主题
 * 避免页面闪烁（FOUC）
 */
export function initThemeOnLoad() {
  // 从 localStorage 读取保存的主题设置
  const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  const themeMode = savedTheme && ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';

  // 更新模块级别的 ref
  mode.value = themeMode;

  // 检测系统主题
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  systemDark.value = prefersDark;

  // 计算是否应该使用深色模式
  const shouldBeDark = themeMode === 'dark' || (themeMode === 'system' && prefersDark);

  // 立即应用 class
  document.documentElement.classList.toggle('dark', shouldBeDark);

  // 标记已初始化
  initialized = true;

  // 设置系统主题监听
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    systemDark.value = e.matches;
    // 如果是 system 模式，需要更新 DOM
    if (mode.value === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}
