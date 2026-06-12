import type { ScramblePresetName, ScramblePresetOptions } from './scramble.types';

export const CODERX_ROLE_WORDS = ['Coder', 'Writer', 'Creator', 'Builder'] as const;

export const SCRAMBLE_PRESETS = {
  // 块状像素扰动：字符像像素块解码一样逐步稳定，贴合 CoderX 的复古技术感。
  pixelBlocks: {
    chars: 'blocks',
    from: 'left',
    duration: 900,
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
