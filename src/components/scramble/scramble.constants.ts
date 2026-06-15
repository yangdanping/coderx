import type { ScramblePresetName, ScramblePresetOptions } from './scramble.types';

export const CODERX_ROLE_WORDS = ['Coder', 'Writer', 'Creator', 'Builder'] as const;
export const CODERX_ROLE_TITLES = ['CoderX', 'WriterX', 'CreatorX', 'BuilderX'] as const;

export const SCRAMBLE_CHARSETS = ['braille', 'katakana', 'binary', 'lowercase', 'symbols'] as const;

export type ScrambleCharset = (typeof SCRAMBLE_CHARSETS)[number];

export function getRandomScrambleChars(previousChars?: ScrambleCharset, random: () => number = Math.random): ScrambleCharset {
  const availableChars = previousChars ? SCRAMBLE_CHARSETS.filter((chars) => chars !== previousChars) : [...SCRAMBLE_CHARSETS];
  const randomIndex = Math.min(availableChars.length - 1, Math.max(0, Math.floor(random() * availableChars.length)));

  return availableChars[randomIndex] ?? SCRAMBLE_CHARSETS[0];
}

/**
 * chars 内置字符集速查（也可以直接传入任意自定义字符串）：
 * - braille：盲文点阵字符，适合复古点阵效果。
 * - katakana：半角片假名，等宽字体下与拉丁字符宽度接近。
 * - binary：01，二进制 / 黑客终端效果。
 * - lowercase：a-z，小写英文字母扰动。
 * - symbols：常用标点与运算符，适合密码噪声效果。
 */
export const SCRAMBLE_PRESETS = {
  pixelBlocks: {
    chars: getRandomScrambleChars(),
    from: 'left',
    duration: 800,
    ease: 'easeOutCubic',
    perturbation: 0.18,
    settleDuration: 180,
    renderMode: 'cells',
  },
  // 快速扫描：随机字符集配合较短时长，呈现紧凑的解码感。
  terminalBinary: {
    chars: getRandomScrambleChars(),
    from: 'random',
    duration: 760,
    ease: 'easeOutQuad',
    perturbation: 0.35,
    renderMode: 'cells',
  },
  // 柔和缓动：随机字符集配合中心扩散，整体变化更加克制。
  softBraille: {
    chars: getRandomScrambleChars(),
    from: 'center',
    duration: 1100,
    ease: 'easeInOutCubic',
    perturbation: 0.12,
    settleDuration: 240,
    renderMode: 'cells',
  },
} as const satisfies Record<ScramblePresetName, ScramblePresetOptions>;

// 从上面定义的预设中选择一个默认值
export const DEFAULT_SCRAMBLE_PRESET: ScramblePresetName = 'pixelBlocks';
