import type { ScramblePresetName, ScramblePresetOptions } from './scramble.types';

export const CODERX_ROLE_WORDS = ['Coder', 'Writer', 'Creator', 'Builder'] as const;
export const CODERX_ROLE_TITLES = ['CoderX', 'WriterX', 'CreatorX', 'BuilderX'] as const;

/**
 * chars 内置字符集速查（也可以直接传入任意自定义字符串）：
 * - blocks：█▓▒░，块状终端 / 赛博朋克效果，也是官网默认值。
 * - shades：░▒▓，密度变化更柔和的块状效果。
 * - braille：盲文点阵字符，适合复古点阵效果。
 * - katakana：半角片假名，等宽字体下与拉丁字符宽度接近。
 * - katakanaFull：全角片假名，适合 CJK 文本或比例字体。
 * - binary：01，二进制 / 黑客终端效果。
 * - hex：0-9 与 A-F，十六进制数据效果。
 * - numbers：0-9，纯数字解码效果。
 * - lowercase：a-z，小写英文字母扰动。
 * - uppercase：A-Z，大写英文字母扰动。
 * - symbols：常用标点与运算符，适合密码噪声效果。
 */
export const SCRAMBLE_PRESETS = {
  pixelBlocks: {
    chars: 'katakana',
    from: 'left',
    duration: 800,
    ease: 'easeOutCubic',
    perturbation: 0.18,
    settleDuration: 180,
    renderMode: 'cells',
  },
  // 二进制终端：使用 0/1 快速扫描，呈现命令行解码感。
  terminalBinary: {
    chars: 'binary',
    from: 'random',
    duration: 760,
    ease: 'easeOutQuad',
    perturbation: 0.35,
    renderMode: 'cells',
  },
  // 柔和盲文颗粒：扰动更细腻，适合希望动效克制一些的页面。
  softBraille: {
    chars: 'braille',
    from: 'center',
    duration: 1100,
    ease: 'easeInOutCubic',
    perturbation: 0.12,
    settleDuration: 240,
    renderMode: 'cells',
  },
} as const satisfies Record<ScramblePresetName, ScramblePresetOptions>;

export const DEFAULT_SCRAMBLE_PRESET: ScramblePresetName = 'pixelBlocks';
