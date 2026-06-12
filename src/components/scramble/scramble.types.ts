import type { UseScrambleOptions } from '@scrambl/vue';

export type ScramblePresetName = 'pixelBlocks' | 'terminalBinary' | 'softBraille';

export type ScramblePresetOptions = Partial<
  Omit<UseScrambleOptions, 'text' | 'onStart' | 'onChange' | 'onComplete' | 'trigger' | 'playOnMount' | 'inViewOptions'>
>;

export interface ScrambleWordProps extends UseScrambleOptions {
  as?: string;
  /**
   * 动画扰动字符：支持 blocks、shades、braille、katakana、katakanaFull、
   * binary、hex、numbers、lowercase、uppercase、symbols，或任意自定义字符串。
   * 未传时默认使用 blocks。
   */
  chars?: UseScrambleOptions['chars'];
}

export interface CyclingScrambleTextProps extends UseScrambleOptions {
  as?: string;
  words?: readonly string[];
  cycleDelay?: number;
  preset?: ScramblePresetName;
  /**
   * 动画扰动字符：支持 blocks、shades、braille、katakana、katakanaFull、
   * binary、hex、numbers、lowercase、uppercase、symbols，或任意自定义字符串。
   * 显式传入时会覆盖当前 preset 中的 chars。
   */
  chars?: UseScrambleOptions['chars'];
}
