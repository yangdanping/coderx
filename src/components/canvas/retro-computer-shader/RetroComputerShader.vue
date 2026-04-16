<template>
  <div ref="containerRef" class="retro-shader-wrap">
    <div v-if="DEBUG_SHOW_YAW" class="retro-debug-yaw">
      {{ yawDebugText }}
    </div>
    <canvas
      ref="canvasRef"
      class="retro-shader-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    />
    <canvas ref="screenSaverCanvasRef" class="retro-screen-saver-canvas" aria-hidden="true" />
  </div>
</template>

<script lang="ts" setup>
import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';
import { useTheme } from '@/composables/useTheme';

import type { Perspective, RetroComputerShaderProps } from './index';
const baseColor = '#94b8ee';
const props = withDefaults(defineProps<RetroComputerShaderProps>(), {
  color: baseColor, // 线条颜色（hex）
  showDecorations: true, // 是否显示轨道环、星形、圆点等装饰
  lineWidth: 1.8, // 线条粗细（像素）
  perspective: 'top-right', // 视角预设
  scale: 1, // 整体缩放倍数
  bezelDepth: 0.08, // 前框薄板厚度（3D 单位，越大越厚）
  backRatio: 0.7, // 四棱台后背缩放比（0=收缩成点 / 1=与前面等大）
  glowIntensity: 1.5, // hover 荧光强度（0=无 / 1=默认 / >1=超强）
  backSideAlpha: 0, // 后背矩形左边和底边透明度（0=消失 / 1=完全显示）
  orbitScale: 1, // 轨道环整体缩放倍率
  orbitLineWidth: 0.6, // 轨道环实线专属粗细（像素）
  particleSpeed: 1, // 粒子运行速度倍率
  showCometTrail: true, // 彗星渐变拖影,
  dot1Color: '#bee0c6', //	粒子 1 + 轨道环 1 颜色；'' → 三者全隐
  dot2Color: '#f3b2ac', //	粒子 2 + 轨道环 2
  dot3Color: baseColor, //粒子 3 + 轨道环 3
  trail1Color: '#bee0c6', //	轨道 1 彗星拖影颜色
  trail2Color: '#f3b2ac', //轨道 2 彗星拖影颜色
  trail3Color: baseColor, //轨道 3 彗星拖影颜色
  screenSaverText: 'coderx',
  showScreenSaver: true,
  screenSaverOpacity: 1,
  screenSaverColor: baseColor,
  screenSaverFontSize: 34,
  screenSaverFontFamily: 'GeistPixel-Line',
  screenSaverSpeed: 0.6,
});

/* ========== 视角预设映射 ========== */

const PERSPECTIVES: Record<Perspective, { yaw: number; pitch: number }> = {
  front: { yaw: 0, pitch: 0 },
  'top-front': { yaw: 0, pitch: 0.65 },
  'top-left': { yaw: 0.55, pitch: 0.65 },
  'top-right': { yaw: -0.55, pitch: 0.65 },
  'bottom-front': { yaw: 0, pitch: -0.65 },
  'bottom-left': { yaw: 0.55, pitch: -0.65 },
  'bottom-right': { yaw: -0.5, pitch: -0.65 },
};

const defaultView = computed(() => PERSPECTIVES[props.perspective] ?? PERSPECTIVES['top-right']);

const { isDark } = useTheme();

/* ========== 工具函数 ========== */

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16) / 255, parseInt(h.substring(2, 4), 16) / 255, parseInt(h.substring(4, 6), 16) / 255];
}

// dotColor: undefined → 继承全局 color（可见）；'' → 隐藏；有效 hex → 使用该颜色
function resolveDotColor(dotColor: string | undefined, fallback: string): [number, number, number, number] {
  if (dotColor === '') return [...hexToVec3(fallback), 0];
  return [...hexToVec3(dotColor ?? fallback), 1];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ========== 响应式状态 ========== */

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const screenSaverCanvasRef = ref<HTMLCanvasElement | null>(null);

const pointer = reactive({ active: false, startX: 0, startYaw: 0 });
const state = reactive({ yaw: defaultView.value.yaw, targetYaw: defaultView.value.yaw, time: 0, hoverVal: 0, hoverTarget: 0 });
const screenSaverState = reactive({ x: 0, y: 0, vx: 1, vy: 0.78, initialized: false });
const restYaw = ref(defaultView.value.yaw);
// 开发调试开关：true 显示实时角度；发布前可保持 false 或注释掉模板中的调试块
const DEBUG_SHOW_YAW = false;
const yawDebugText = computed(() => {
  const deg = (state.yaw * 180) / Math.PI;
  const sign = deg > 0 ? '+' : '';
  return `${sign}${deg.toFixed(1)}deg`;
});

// 滚动归零距离（像素）：滚动达到该距离时，目标角度衰减到 0deg。
// 调大 -> 归零更慢；调小 -> 归零更快。
const SCROLL_DISTANCE_TO_ZERO = 300;

function getScrollRestYaw() {
  if (typeof window === 'undefined') return defaultView.value.yaw;
  const distance = Math.max(1, SCROLL_DISTANCE_TO_ZERO);
  const scrollProgress = clamp(window.scrollY / distance, 0, 1);
  return defaultView.value.yaw * (1 - scrollProgress);
}

function syncRestYawByScroll() {
  restYaw.value = getScrollRestYaw();
  // 拖拽中由 pointer 控制 targetYaw，滚动仅更新归位目标角。
  if (!pointer.active) state.targetYaw = restYaw.value;
}

watch(
  () => props.perspective,
  () => {
    syncRestYawByScroll();
  },
);

const MAX_YAW = 0.7;

// ── 响应式 scale 断点（在这里调整数值）────────────────────────
// SCALE_WIDE_BREAKPOINT  ：宽于此值时使用完整 scale，不再缩小
// SCALE_NARROW_BREAKPOINT：窄于此值时 scale 降至最小值 1.0
const SCALE_WIDE_BREAKPOINT = 1470;
const SCALE_MIDDLE_BREAKPOINT = 1100;
const SCALE_NARROW_BREAKPOINT = 900;

// 旋转留白系数：最终 scale = props.scale × 此值
// 减小 → 图形更小、四周留白更多，旋转/拖拽不溢出
// 增大 → 图形更充盈（注意过大时旋转会超出画幅）
const ROTATION_PADDING_FACTOR = 0.7;

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);

// 平滑插值（ease-out quad）：从最大尺寸渐变到 1.0
const effectiveScale = computed(() => {
  const w = windowWidth.value;
  // 基准提升：将 props.scale 映射到原来的 1.8 倍
  const adjustedScale = props.scale * 1.8;
  const maxScale = adjustedScale * ROTATION_PADDING_FACTOR;
  if (w >= SCALE_WIDE_BREAKPOINT) return maxScale;
  if (w >= SCALE_MIDDLE_BREAKPOINT) return 0.85;
  if (w >= SCALE_NARROW_BREAKPOINT) return 0.7;
  return 0.6;
});

function onWindowResize() {
  windowWidth.value = window.innerWidth;
}

function onWindowScroll() {
  syncRestYawByScroll();
}

let rafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let screenSaverCtx: CanvasRenderingContext2D | null = null;
let uLocs: Record<string, WebGLUniformLocation | null> = {};
const pendingSize = reactive({ w: 0, h: 0, dirty: false });

const monitorCenter = { x: -0.07, y: 0.05, z: 0.0 };
const screenCenter = { x: monitorCenter.x, y: 0.078 };
const screenHalf = { x: 0.182, y: 0.118 };
const frontZ = 0.05;

/* ========== WebGL 上下文环境初始化 ========== */

function compileShader(g: WebGLRenderingContext, type: number, src: string) {
  const s = g.createShader(type);
  if (!s) return null;
  g.shaderSource(s, src);
  g.compileShader(s);
  if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
    console.error('Shader compile:', g.getShaderInfoLog(s));
    g.deleteShader(s);
    return null;
  }
  return s;
}

function linkProgram(g: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const p = g.createProgram();
  if (!p) return null;
  g.attachShader(p, vs);
  g.attachShader(p, fs);
  g.linkProgram(p);
  if (!g.getProgramParameter(p, g.LINK_STATUS)) {
    console.error('Program link:', g.getProgramInfoLog(p));
    g.deleteProgram(p);
    return null;
  }
  return p;
}

function initGL(): boolean {
  const canvas = canvasRef.value;
  if (!canvas) return false;

  gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
  });
  if (!gl) return false;

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vs || !fs) return false;

  program = linkProgram(gl, vs, fs);
  if (!program) return false;

  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // prettier-ignore
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1, 1, 1,-1,  1,1,
  ]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  uLocs = {
    res: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    yaw: gl.getUniformLocation(program, 'u_yaw'),
    pitch: gl.getUniformLocation(program, 'u_pitch'),
    scale: gl.getUniformLocation(program, 'u_scale'),
    color: gl.getUniformLocation(program, 'u_color'),
    lw: gl.getUniformLocation(program, 'u_lineWidth'),
    deco: gl.getUniformLocation(program, 'u_decorations'),
    hover: gl.getUniformLocation(program, 'u_hover'),
    bezelDepth: gl.getUniformLocation(program, 'u_bezelDepth'),
    backRatio: gl.getUniformLocation(program, 'u_backRatio'),
    glowIntensity: gl.getUniformLocation(program, 'u_glowIntensity'),
    backSideColor: gl.getUniformLocation(program, 'u_backSideColor'),
    backSideAlpha: gl.getUniformLocation(program, 'u_backSideAlpha'),
    orbitScale: gl.getUniformLocation(program, 'u_orbitScale'),
    orbitLineWidth: gl.getUniformLocation(program, 'u_orbitLineWidth'),
    particleSpeed: gl.getUniformLocation(program, 'u_particleSpeed'),
    cometTrail: gl.getUniformLocation(program, 'u_cometTrail'),
    darkMode: gl.getUniformLocation(program, 'u_darkMode'),
    dot1Color: gl.getUniformLocation(program, 'u_dot1Color'),
    dot2Color: gl.getUniformLocation(program, 'u_dot2Color'),
    dot3Color: gl.getUniformLocation(program, 'u_dot3Color'),
    trail1Color: gl.getUniformLocation(program, 'u_trail1Color'),
    trail2Color: gl.getUniformLocation(program, 'u_trail2Color'),
    trail3Color: gl.getUniformLocation(program, 'u_trail3Color'),
  };

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return true;
}

/* ========== 画布缩放 (DPR 适配) ========== */

function markResize() {
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));

  if (w !== pendingSize.w || h !== pendingSize.h) {
    pendingSize.w = w;
    pendingSize.h = h;
    pendingSize.dirty = true;
  }
}

function applyResize() {
  const canvas = canvasRef.value;
  const screenSaverCanvas = screenSaverCanvasRef.value;
  if (!canvas || !gl || !pendingSize.dirty) return;

  canvas.width = pendingSize.w;
  canvas.height = pendingSize.h;
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  if (screenSaverCanvas) {
    screenSaverCanvas.width = pendingSize.w;
    screenSaverCanvas.height = pendingSize.h;
    screenSaverCanvas.style.width = '100%';
    screenSaverCanvas.style.height = '100%';
  }

  gl.viewport(0, 0, pendingSize.w, pendingSize.h);
  pendingSize.dirty = false;
}

function projectIsoPointToPixel(x: number, y: number, z: number, yaw: number, pitch: number, bob: number, width: number, height: number) {
  const cY = Math.cos(yaw);
  const sY = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = cY * x + sY * z;
  const z1 = -sY * x + cY * z;
  const qx = x1;
  const qy = cp * y - sp * z1 + bob;
  const aspect = width / height;

  return {
    x: ((qx / aspect) * effectiveScale.value + 0.5) * width,
    // WebGL 片元坐标原点在左下，而 2D canvas 在左上，这里做 y 轴翻转
    y: (0.5 - qy * effectiveScale.value) * height,
  };
}

function interpolateYByX(a: { x: number; y: number }, b: { x: number; y: number }, x: number) {
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-6) return (a.y + b.y) * 0.5;
  const t = clamp((x - a.x) / dx, 0, 1);
  return a.y + (b.y - a.y) * t;
}

function drawScreenSaverText() {
  if (!screenSaverCtx) return;
  const canvas = screenSaverCanvasRef.value;
  if (!canvas) return;

  screenSaverCtx.clearRect(0, 0, canvas.width, canvas.height);

  const text = props.screenSaverText;
  const isEnabled = props.showScreenSaver && text !== '' && props.screenSaverOpacity > 0;
  if (!isEnabled) {
    screenSaverState.initialized = false;
    return;
  }

  const pitch = defaultView.value.pitch;
  const yaw = state.yaw;
  const bob = Math.sin(state.time * 1.2) * 0.005;
  const pBL = projectIsoPointToPixel(screenCenter.x - screenHalf.x, screenCenter.y - screenHalf.y, frontZ, yaw, pitch, bob, canvas.width, canvas.height);
  const pBR = projectIsoPointToPixel(screenCenter.x + screenHalf.x, screenCenter.y - screenHalf.y, frontZ, yaw, pitch, bob, canvas.width, canvas.height);
  const pTR = projectIsoPointToPixel(screenCenter.x + screenHalf.x, screenCenter.y + screenHalf.y, frontZ, yaw, pitch, bob, canvas.width, canvas.height);
  const pTL = projectIsoPointToPixel(screenCenter.x - screenHalf.x, screenCenter.y + screenHalf.y, frontZ, yaw, pitch, bob, canvas.width, canvas.height);
  const corners = [pBL, pBR, pTR, pTL];

  const minX = Math.min(...corners.map((p) => p.x));
  const maxX = Math.max(...corners.map((p) => p.x));
  const minY = Math.min(...corners.map((p) => p.y));
  const maxY = Math.max(...corners.map((p) => p.y));

  const dpr = Math.max(1, canvas.width / Math.max(1, containerRef.value?.clientWidth ?? canvas.width));
  const fontSize = Math.max(8, props.screenSaverFontSize) * dpr;
  const padding = 2 * dpr;

  screenSaverCtx.font = `${fontSize}px ${props.screenSaverFontFamily}`;
  screenSaverCtx.textAlign = 'left';
  screenSaverCtx.textBaseline = 'top';
  const metrics = screenSaverCtx.measureText(text);
  const textWidth = Math.max(1, metrics.width);
  const textHeight = Math.max(fontSize, (metrics.actualBoundingBoxAscent || fontSize * 0.8) + (metrics.actualBoundingBoxDescent || fontSize * 0.2));

  const boundLeft = minX + padding;
  const boundRight = maxX - padding - textWidth;
  // trade-off: 当文本宽度超过屏幕可用宽度时，boundRight 会落到 boundLeft 左侧。
  // 此时直接不渲染（return），避免文字在极窄/无有效运动区间时抖动或越界绘制。
  if (boundRight <= boundLeft) return;

  const centerX = (boundLeft + boundRight) * 0.5;
  const initTop = Math.max(interpolateYByX(pTL, pTR, centerX), interpolateYByX(pTL, pTR, centerX + textWidth)) + padding;
  const initBottom = Math.min(interpolateYByX(pBL, pBR, centerX), interpolateYByX(pBL, pBR, centerX + textWidth)) - padding - textHeight;
  // trade-off: 屏幕在当前透视下若无法容纳该字号文本的高度，也直接不渲染。
  if (initBottom <= initTop) return;

  if (!screenSaverState.initialized) {
    screenSaverState.x = centerX;
    screenSaverState.y = (initTop + initBottom) * 0.5;
    screenSaverState.vx = 1;
    screenSaverState.vy = 0.78;
    screenSaverState.initialized = true;
  }

  const speedMul = Math.max(0, props.screenSaverSpeed);
  const baseSpeed = 70 * dpr;
  screenSaverState.x += (screenSaverState.vx * baseSpeed * speedMul) / 60;
  screenSaverState.y += (screenSaverState.vy * baseSpeed * speedMul) / 60;

  if (screenSaverState.x <= boundLeft) {
    screenSaverState.x = boundLeft;
    screenSaverState.vx = Math.abs(screenSaverState.vx);
  } else if (screenSaverState.x >= boundRight) {
    screenSaverState.x = boundRight;
    screenSaverState.vx = -Math.abs(screenSaverState.vx);
  }

  // 关键修复：纵向边界不再使用固定 minY/maxY，
  // 而是根据当前文本左右 x 在屏幕上/下边线的插值结果动态计算，
  // 避免文本先“穿出屏幕”再反弹。
  const textLeftX = screenSaverState.x;
  const textRightX = screenSaverState.x + textWidth;
  const topAtLeft = interpolateYByX(pTL, pTR, textLeftX);
  const topAtRight = interpolateYByX(pTL, pTR, textRightX);
  const bottomAtLeft = interpolateYByX(pBL, pBR, textLeftX);
  const bottomAtRight = interpolateYByX(pBL, pBR, textRightX);
  const boundTop = Math.max(topAtLeft, topAtRight) + padding;
  const boundBottom = Math.min(bottomAtLeft, bottomAtRight) - padding - textHeight;

  // trade-off: 运动过程中若当前 x 对应的上下边界反转（可用高度不足），
  // 重置 initialized 并跳过本帧，等待后续视角/文本变化后再重新初始化。
  if (boundBottom <= boundTop) {
    screenSaverState.initialized = false;
    return;
  }

  if (screenSaverState.y <= boundTop) {
    screenSaverState.y = boundTop;
    screenSaverState.vy = Math.abs(screenSaverState.vy);
  } else if (screenSaverState.y >= boundBottom) {
    screenSaverState.y = boundBottom;
    screenSaverState.vy = -Math.abs(screenSaverState.vy);
  }

  const [r, g, b] = hexToVec3(props.screenSaverColor || props.color);
  screenSaverCtx.save();
  screenSaverCtx.beginPath();
  screenSaverCtx.moveTo(pBL.x, pBL.y);
  screenSaverCtx.lineTo(pBR.x, pBR.y);
  screenSaverCtx.lineTo(pTR.x, pTR.y);
  screenSaverCtx.lineTo(pTL.x, pTL.y);
  screenSaverCtx.closePath();
  screenSaverCtx.clip();
  screenSaverCtx.globalAlpha = clamp(props.screenSaverOpacity, 0, 1);
  screenSaverCtx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  screenSaverCtx.shadowColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${isDark.value ? 0.42 : 0.22})`;
  screenSaverCtx.shadowBlur = 4 * dpr;
  screenSaverCtx.fillText(text, screenSaverState.x, screenSaverState.y);
  screenSaverCtx.restore();
}

/* ========== 拖拽交互 (Pointer Events) ========== */

function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  pointer.active = true;
  pointer.startX = e.clientX;
  pointer.startYaw = state.targetYaw;
  canvas.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!pointer.active || !containerRef.value) return;
  const w = Math.max(1, containerRef.value.clientWidth);
  const delta = (e.clientX - pointer.startX) / w;
  state.targetYaw = clamp(pointer.startYaw + delta * 2.1, -MAX_YAW, MAX_YAW);
}

function onMouseEnter() {
  state.hoverTarget = 1;
}

function onMouseLeave() {
  state.hoverTarget = 0;
}

function onPointerUp(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  if (pointer.active) {
    pointer.active = false;
    state.targetYaw = restYaw.value;
  }
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
}

/* ========== 渲染循环 (Uniforms 传参) ========== */

function render() {
  if (!gl || !program) {
    rafId = requestAnimationFrame(render);
    return;
  }

  applyResize();

  state.time += 1 / 60;
  state.yaw += (state.targetYaw - state.yaw) * 0.12;
  state.hoverVal += (state.hoverTarget - state.hoverVal) * 0.08;

  const [r, g, b] = hexToVec3(props.color);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.uniform2f(uLocs.res!, gl.canvas.width, gl.canvas.height);
  gl.uniform1f(uLocs.time!, state.time);
  gl.uniform1f(uLocs.yaw!, state.yaw);
  gl.uniform1f(uLocs.pitch!, defaultView.value.pitch);
  gl.uniform1f(uLocs.scale!, effectiveScale.value);
  gl.uniform3f(uLocs.color!, r, g, b);
  gl.uniform1f(uLocs.lw!, props.lineWidth);
  gl.uniform1f(uLocs.deco!, props.showDecorations ? 1.0 : 0.0);
  gl.uniform1f(uLocs.hover!, state.hoverVal);
  gl.uniform1f(uLocs.bezelDepth!, props.bezelDepth);
  gl.uniform1f(uLocs.backRatio!, props.backRatio);
  gl.uniform1f(uLocs.glowIntensity!, props.glowIntensity);
  const [bsr, bsg, bsb] = hexToVec3(props.backSideColor ?? props.color);
  gl.uniform3f(uLocs.backSideColor!, bsr, bsg, bsb);
  gl.uniform1f(uLocs.backSideAlpha!, props.backSideAlpha);
  gl.uniform1f(uLocs.orbitScale!, props.orbitScale);
  gl.uniform1f(uLocs.orbitLineWidth!, props.orbitLineWidth);
  gl.uniform1f(uLocs.particleSpeed!, props.particleSpeed);
  gl.uniform1f(uLocs.cometTrail!, props.showCometTrail ? 1.0 : 0.0);
  gl.uniform1f(uLocs.darkMode!, isDark.value ? 1.0 : 0.0);

  const [d1r, d1g, d1b, d1a] = resolveDotColor(props.dot1Color, props.color);
  gl.uniform4f(uLocs.dot1Color!, d1r, d1g, d1b, d1a);
  const [d2r, d2g, d2b, d2a] = resolveDotColor(props.dot2Color, props.color);
  gl.uniform4f(uLocs.dot2Color!, d2r, d2g, d2b, d2a);
  const [d3r, d3g, d3b, d3a] = resolveDotColor(props.dot3Color, props.color);
  gl.uniform4f(uLocs.dot3Color!, d3r, d3g, d3b, d3a);
  const [t1r, t1g, t1b] = hexToVec3(props.trail1Color || props.color);
  gl.uniform3f(uLocs.trail1Color!, t1r, t1g, t1b);
  const [t2r, t2g, t2b] = hexToVec3(props.trail2Color || props.color);
  gl.uniform3f(uLocs.trail2Color!, t2r, t2g, t2b);
  const [t3r, t3g, t3b] = hexToVec3(props.trail3Color || props.color);
  gl.uniform3f(uLocs.trail3Color!, t3r, t3g, t3b);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  drawScreenSaverText();
  rafId = requestAnimationFrame(render);
}

/* ========== 生命周期 ========== */

onMounted(() => {
  if (!initGL()) return;
  screenSaverCtx = screenSaverCanvasRef.value?.getContext('2d') ?? null;
  markResize();
  syncRestYawByScroll();
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(markResize);
    resizeObserver.observe(containerRef.value);
  }
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  rafId = requestAnimationFrame(render);
});

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('scroll', onWindowScroll);
  screenSaverCtx = null;
  if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
  gl = null;
  program = null;
});
</script>

<style lang="scss" scoped>
.retro-shader-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.retro-shader-canvas {
  position: absolute;
  inset: 0;
  display: block;
  // width: 100%;
  // height: 100%;
  cursor: var(--cursorGrab);
  touch-action: none;
  &:active {
    cursor: var(--cursorGrabbed);
  }
}

.retro-screen-saver-canvas {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
}

.retro-debug-yaw {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  pointer-events: none;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.2;
  color: #6a8fcf;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 184, 238, 0.5);
}
</style>
