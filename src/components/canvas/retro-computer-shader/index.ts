export type Perspective = 'front' | 'top-front' | 'top-left' | 'top-right' | 'bottom-front' | 'bottom-left' | 'bottom-right';

export interface RetroComputerShaderProps {
  /** 绘制颜色，默认 '#94b8ee' */
  color?: string;
  /** 是否显示装饰元素（轨道环、星形、圆点），默认 true */
  showDecorations?: boolean;
  /** 线条粗细，默认 1.8 */
  lineWidth?: number;
  /** 默认视角预设，默认 'top-right' */
  perspective?: Perspective;
  /** 渲染图整体缩放倍数，值越大图越大，默认 1.0 */
  scale?: number;
  /** 前框厚度（3D 单位），值越大前框越厚，默认 0.04 */
  bezelDepth?: number;
  /** 四棱台后背缩放比（相对前面尺寸，0=收缩成点 / 1=与前面等大），默认 0.64 */
  backRatio?: number;
  /** hover 时荧光呼吸强度（0=无 glow / 1=默认 / 2+=超强），默认 1.0 */
  glowIntensity?: number;
  /** 后背矩形左边和底边的颜色（hex），默认与 color 相同 */
  backSideColor?: string;
  /** 后背矩形左边和底边的透明度（0=消失 / 1=完全显示），默认 1.0 */
  backSideAlpha?: number;
  /** 轨道环整体缩放倍率（1=原始大小 / >1=扩大范围），默认 1.0 */
  orbitScale?: number;
  /** 轨道环实线专属粗细（像素），独立于 lineWidth，默认 1.2 */
  orbitLineWidth?: number;
  /** 粒子沿轨道运行速度倍率（1=原速 / >1=更快 / <1=更慢），默认 1.0 */
  particleSpeed?: number;
  /** 是否显示彗星渐变拖影效果，默认 false */
  showCometTrail?: boolean;
  /** 粒子 1 + 轨道环 1 颜色（hex），默认继承全局 color；传 '' 则隐藏粒子/轨道/拖影 */
  dot1Color?: string;
  /** 粒子 2 + 轨道环 2 颜色（hex），默认继承全局 color；传 '' 则隐藏粒子/轨道/拖影 */
  dot2Color?: string;
  /** 粒子 3 + 轨道环 3 颜色（hex），默认继承全局 color；传 '' 则隐藏粒子/轨道/拖影 */
  dot3Color?: string;
  /** 轨道 1 彗星拖影颜色（hex），默认继承全局 color */
  trail1Color?: string;
  /** 轨道 2 彗星拖影颜色（hex），默认继承全局 color */
  trail2Color?: string;
  /** 轨道 3 彗星拖影颜色（hex），默认继承全局 color */
  trail3Color?: string;
  /** 屏保文本内容；空字符串时不渲染，支持 emoji */
  screenSaverText?: string;
  /** 是否显示屏保文本；默认 true */
  showScreenSaver?: boolean;
  /** 屏保文本透明度（0~1）；默认 1 */
  screenSaverOpacity?: number;
  /** 屏保文本颜色（hex）；默认和线条一致 '#94b8ee' */
  screenSaverColor?: string;
  /** 屏保字体大小（像素）；默认 18 */
  screenSaverFontSize?: number;
  /** 屏保字体族（CSS font-family）；默认系统安全字体 + emoji 字体 */
  screenSaverFontFamily?: string;
  /** 屏保运动速度倍率（1=默认）；默认 1 */
  screenSaverSpeed?: number;
}

export { default as RetroComputerShader } from './RetroComputerShader.vue';
