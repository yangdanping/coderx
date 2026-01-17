/**
 * 键盘快捷键相关工具函数
 * 
 * 本模块主要用于根据用户操作系统显示对应的键盘快捷键符号。
 * 
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator/platform
 * @see ../../../说明文档/08_项目优化沙盒推演/04_浏览器API兼容性说明.md
 */

/**
 * 检测是否为 Mac/iOS 系统
 * 
 * **多层降级策略：**
 * 1. navigator.userAgentData.platform (User-Agent Client Hints API) - 最现代，Chrome 90+
 * 2. navigator.platform (已弃用但广泛支持) - 所有浏览器都支持
 * 3. navigator.userAgent (不推荐但兼容性最好) - 最后的降级方案
 * 
 * **为什么使用平台检测？**
 * 根据 MDN 文档，对于显示键盘快捷键修饰符（⌘ vs Ctrl）这一特定场景，
 * 使用平台检测是合理的选择。
 * 
 * **浏览器支持：**
 * - Chrome 90+: 使用 userAgentData ✅
 * - Firefox/Safari: 使用 platform ✅
 * - 旧版浏览器: 使用 platform 或 userAgent ✅
 * 
 * @returns {boolean} 如果是 Mac/iOS 系统返回 true，否则返回 false
 * 
 * @example
 * ```typescript
 * if (isMacOS()) {
 *   console.log('显示 ⌘B')
 * } else {
 *   console.log('显示 Ctrl+B')
 * }
 * ```
 */
export const isMacOS = (): boolean => {
  // 1️⃣ 优先使用 User-Agent Client Hints API (最现代的方式)
  // Chrome 90+, Edge 90+, Opera 76+ 支持
  // @ts-ignore - userAgentData 是实验性 API，TypeScript 可能不识别
  if (navigator.userAgentData?.platform) {
    // @ts-ignore
    const platform = navigator.userAgentData.platform
    // userAgentData.platform 返回: "macOS", "Windows", "Linux" 等
    return /mac/i.test(platform)
  }

  // 2️⃣ 降级到 navigator.platform (已弃用但广泛支持)
  // 所有现代浏览器都支持，包括 Firefox, Safari
  if (navigator.platform) {
    // platform 返回: "MacIntel", "Win32", "Linux x86_64", "iPhone", "iPad" 等
    return /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
  }

  // 3️⃣ 最后降级到 userAgent (确保在极端情况下也能工作)
  // 所有浏览器都支持，包括非常旧的浏览器
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
}

/**
 * Mac 键盘符号映射
 */
export const MacKeySymbols = {
  Command: '⌘', // U+2318
  Ctrl: '⌃', // U+2303
  Option: '⌥', // U+2325
  Alt: '⌥', // U+2325
  Shift: '⇧', // U+21E7
  Enter: '⏎', // U+23CE
  Delete: '⌫', // U+232B
  Escape: '⎋', // U+238B
  Tab: '⇥', // U+21E5
} as const

/**
 * 快捷键配置接口
 */
export interface ShortcutConfig {
  /** Windows/Linux 系统的快捷键描述 */
  windows: string
  /** Mac 系统的快捷键描述 */
  mac: string
}

/**
 * 格式化快捷键显示
 * @param config 快捷键配置对象
 * @returns 根据当前系统返回对应的快捷键字符串
 */
export const formatShortcut = (config: ShortcutConfig): string => {
  return isMacOS() ? config.mac : config.windows
}

/**
 * 常用快捷键预设
 */
export const commonShortcuts = {
  bold: {
    windows: 'Ctrl+B',
    mac: `${MacKeySymbols.Command}B`,
  },
  italic: {
    windows: 'Ctrl+I',
    mac: `${MacKeySymbols.Command}I`,
  },
  underline: {
    windows: 'Ctrl+U',
    mac: `${MacKeySymbols.Command}U`,
  },
  undo: {
    windows: 'Ctrl+Z',
    mac: `${MacKeySymbols.Command}Z`,
  },
  redo: {
    windows: 'Ctrl+Y',
    mac: `${MacKeySymbols.Command}${MacKeySymbols.Shift}Z`,
  },
  save: {
    windows: 'Ctrl+S',
    mac: `${MacKeySymbols.Command}S`,
  },
  find: {
    windows: 'Ctrl+F',
    mac: `${MacKeySymbols.Command}F`,
  },
  selectAll: {
    windows: 'Ctrl+A',
    mac: `${MacKeySymbols.Command}A`,
  },
  quit: {
    windows: 'Ctrl+Q',
    mac: `${MacKeySymbols.Ctrl}Q`,
  },
} as const
