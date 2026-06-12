import type { UseScrambleOptions } from '@scrambl/vue';

export type ScramblePresetName = 'pixelBlocks' | 'terminalBinary' | 'softBraille';

export type ScramblePresetOptions = Partial<
  Omit<UseScrambleOptions, 'text' | 'onStart' | 'onChange' | 'onComplete' | 'trigger' | 'playOnMount' | 'inViewOptions'>
>;

export interface ScrambleWordProps extends UseScrambleOptions {
  as?: string;
}

export interface CyclingScrambleTextProps extends UseScrambleOptions {
  as?: string;
  words?: readonly string[];
  cycleDelay?: number;
  preset?: ScramblePresetName;
}
