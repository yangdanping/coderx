<template>
  <div ref="containerRef" class="code-spotlight-container">
    <canvas ref="canvasRef" class="code-spotlight-canvas" @mousemove="handleMouseMove" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"></canvas>
  </div>
</template>

<script lang="ts" setup>
import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';
import langKeywords from './lang-keywords.json';

interface KeywordItem {
  text: string;
  x: number;
  y: number;
  width: number;
  scale: number;
}

const props = withDefaults(
  defineProps<{
    /** 滚动方向：'left' 向左滚动 | 'right' 向右滚动 */
    scrollDirection?: 'left' | 'right';
    /** 滚动速度（像素/帧），值越大滚动越快 */
    scrollSpeed?: number;
    /** 聚光灯半径（像素），决定照亮区域的大小 */
    spotlightRadius?: number;
    /** 字体大小（像素） */
    fontSize?: number;
    /** 行高（像素），决定文字行间距和垂直密度 */
    lineHeight?: number;
    /** 关键词水平间距（像素），决定水平密度 */
    spacing?: number;
    /** 高亮关键字的缩放倍数 */
    highlightScale?: number;
    /** 高亮关键字的比例（0-1） */
    highlightRatio?: number;
    /** 自定义关键词列表，若不传则从 lang-keywords.json 随机获取 */
    keywords?: string[];
    /** 色散强度，控制 RGB 通道偏移量 */
    dispersion?: number;
    /** 色散生效的内边界比例（相对 spotlightRadius） */
    dispersionInnerRatio?: number;
    /** 色散衰减结束的外边界比例（相对 spotlightRadius） */
    dispersionOuterRatio?: number;
    /** 是否开启凸透镜效果 */
    enableLens?: boolean;
    /** 凸透镜缩放倍数 */
    lensMagnification?: number;
  }>(),
  {
    keywords: () => [],
    scrollDirection: 'left',
    scrollSpeed: 0.3,
    spotlightRadius: 300,
    fontSize: 16,
    lineHeight: 34,
    spacing: 10,
    highlightScale: 1.8,
    highlightRatio: 0.3,
    dispersion: 0.02,
    dispersionInnerRatio: 0.75,
    dispersionOuterRatio: 1.3,
    enableLens: true,
    lensMagnification: 1.03,
  },
);

const BASE_BRIGHTNESS = 0.08;

// Refs
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const mousePosition = ref({ x: 0, y: 0 });
const isMouseInCanvas = ref(false);
const animationId = ref<number | null>(null);
const scrollOffset = ref(0);
const canvasSize = ref({ width: 0, height: 0 });
const singleLoopWidth = ref(0);
const fontFamily = 'Gohufont';

const displayKeywords = ref<string[]>([]);

/**
 * 初始化关键词：从 lang-keywords.json 中随机选择一种语言或使用混合模式
 */
function initKeywords() {
  if (props.keywords && props.keywords.length > 0) {
    displayKeywords.value = props.keywords;
    return;
  }

  const keywordsData = langKeywords as Record<string, string[]>;
  const langs = Object.keys(keywordsData).filter((k) => k !== 'common');
  // 25% 概率进入 randomLang (混合模式)
  const isRandomMode = Math.random() < 0.25;

  let selected: string[] = [...(keywordsData.common || [])];

  if (isRandomMode) {
    // 混合模式：所有语言关键词混搭
    const allLangsKeywords = langs.flatMap((l) => keywordsData[l] || []);
    selected = [...new Set([...selected, ...allLangsKeywords])];
  } else if (langs.length > 0) {
    // 随机选择一种语言
    const randomLang = langs[Math.floor(Math.random() * langs.length)];
    if (randomLang) {
      const langSpecific = keywordsData[randomLang];
      if (langSpecific) {
        selected = [...new Set([...selected, ...langSpecific])];
      }
    }
  }

  // 限制数量，避免过多影响性能 (保持在 30 个左右)
  displayKeywords.value = selected.slice(0, 30);
}

// WebGL related
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

const spotlightPosition = computed(() => {
  if (isMouseInCanvas.value) {
    return mousePosition.value;
  }
  return {
    x: canvasSize.value.width / 2,
    y: canvasSize.value.height / 2,
  };
});

// 初始化 WebGL
function initGL() {
  /* ========== WebGL 上下文环境初始化 ========== */
  const canvas = canvasRef.value;
  if (!canvas) return;

  gl = canvas.getContext('webgl');
  if (!gl) return;

  const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vs || !fs) return;

  program = createProgram(gl, vs, fs);
  if (!program) return;

  gl.useProgram(program);

  // 设置全屏四边形顶点数据
  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // 创建纹理
  texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// 将文字渲染到离屏画布并生成纹理
function updateTexture() {
  /* ========== 纹理画质优化 (DPR 适配) ========== */
  if (!gl || !texture) return;

  const width = canvasSize.value.width;
  const height = canvasSize.value.height;
  if (width === 0 || height === 0) return;

  const dpr = window.devicePixelRatio || 1;

  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
  }

  // 纹理尺寸需要是 2 的幂次方以获得最佳兼容性和性能
  const texWidth = nextPowerOfTwo(width * 2 * dpr);
  const texHeight = nextPowerOfTwo(height * dpr);

  offscreenCanvas.width = texWidth;
  offscreenCanvas.height = texHeight;
  offscreenCtx = offscreenCanvas.getContext('2d');

  if (!offscreenCtx) return;

  offscreenCtx.clearRect(0, 0, texWidth, texHeight);
  offscreenCtx.textBaseline = 'middle';
  offscreenCtx.fillStyle = 'white';

  /* ========== 随机密度与布局逻辑 ========== */
  // 使用缩放后的 DPR 绘制文字以保证清晰度
  offscreenCtx.scale(dpr, dpr);

  // 为首行文字预留顶部安全区，避免高亮放大 + 随机偏移导致裁切（纹理写入阶段）
  // 这与 shaders/fragment.glsl 中 scrolledUv.y 的“顶部对齐采样”相辅相成：
  // 前者防止文字生成时越界，后者防止显示采样时截断。
  const maxScale = Math.max(1, props.highlightScale);
  const maxFontSize = props.fontSize * maxScale;
  const topSafePadding = Math.ceil(maxFontSize * 0.65) + 6;
  let y = Math.max(props.lineHeight, topSafePadding);
  let maxW = 0;

  // 填充整个纹理宽度，确保无缝循环
  while (y < height) {
    let x = Math.random() * 100;

    // 注意：这里的 texWidth 是像素值，需要除以 dpr 换算回绘图坐标
    const drawingWidth = texWidth / dpr;

    while (x < drawingWidth) {
      const keyword = displayKeywords.value[Math.floor(Math.random() * displayKeywords.value.length)] || '';
      const scale = Math.random() < props.highlightRatio ? props.highlightScale : 1;

      offscreenCtx.font = `${props.fontSize * scale}px ${fontFamily}, monospace`;
      const textWidth = offscreenCtx.measureText(keyword).width;

      const yOffset = (Math.random() - 0.5) * 5;
      const drawY = Math.max(topSafePadding, y + yOffset);
      offscreenCtx.fillText(keyword, x, drawY);

      // 增加间距随机性，解决过于密集的问题
      x += textWidth + props.spacing + Math.random() * 100;
    }
    y += props.lineHeight + Math.random() * 15; // 增加行间距随机性
  }

  singleLoopWidth.value = maxW;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
}

function nextPowerOfTwo(n: number) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

// 渲染函数
function render() {
  if (!gl || !program) {
    animationId.value = requestAnimationFrame(render);
    return;
  }

  /* ========== 画布布局与填充控制 ========== */
  const { width, height } = canvasSize.value;
  if (width === 0 || height === 0) {
    animationId.value = requestAnimationFrame(render);
    return;
  }

  // 更新滚动偏移
  const direction = props.scrollDirection === 'left' ? 1 : -1;
  // 基于纹理实际宽度的归一化偏移量
  const texWidth = offscreenCanvas ? offscreenCanvas.width / (window.devicePixelRatio || 1) : width;
  scrollOffset.value = (scrollOffset.value + (props.scrollSpeed / texWidth) * direction + 1.0) % 1.0;

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  /* ========== 聚光灯位置与参数调节 (Uniforms) ========== */
  const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
  const radiusLoc = gl.getUniformLocation(program, 'u_radius');
  const aspectLoc = gl.getUniformLocation(program, 'u_aspect');
  const brightnessLoc = gl.getUniformLocation(program, 'u_brightness');
  const dispersionLoc = gl.getUniformLocation(program, 'u_dispersion');
  const dispersionInnerRatioLoc = gl.getUniformLocation(program, 'u_dispersionInnerRatio');
  const dispersionOuterRatioLoc = gl.getUniformLocation(program, 'u_dispersionOuterRatio');
  const scrollOffsetLoc = gl.getUniformLocation(program, 'u_scrollOffset');
  const enableLensLoc = gl.getUniformLocation(program, 'u_enableLens');
  const lensMagnificationLoc = gl.getUniformLocation(program, 'u_lensMagnification');
  const textureRatioLoc = gl.getUniformLocation(program, 'u_textureRatio');
  const textureHeightRatioLoc = gl.getUniformLocation(program, 'u_textureHeightRatio');
  const textureLoc = gl.getUniformLocation(program, 'u_texture');

  const spot = spotlightPosition.value;
  // 将 DOM 坐标映射到 WebGL 归一化坐标 (0-1)，注意 Y 轴翻转
  gl.uniform2f(mouseLoc, spot.x / width, 1.0 - spot.y / height);

  // 聚光灯半径：统一使用高度作为基准，确保在不同宽高比下表现一致
  gl.uniform1f(radiusLoc, props.spotlightRadius / height);
  gl.uniform1f(aspectLoc, width / height);
  gl.uniform1f(brightnessLoc, BASE_BRIGHTNESS);
  gl.uniform1f(dispersionLoc, props.dispersion);
  gl.uniform1f(dispersionInnerRatioLoc, props.dispersionInnerRatio);
  gl.uniform1f(dispersionOuterRatioLoc, props.dispersionOuterRatio);
  gl.uniform1f(scrollOffsetLoc, scrollOffset.value);
  gl.uniform1f(enableLensLoc, props.enableLens ? 1.0 : 0.0);
  gl.uniform1f(lensMagnificationLoc, props.lensMagnification);

  // 计算屏幕宽度与纹理宽度的比例，确保文字不被拉伸
  const dpr = window.devicePixelRatio || 1;
  const realTexWidth = offscreenCanvas ? offscreenCanvas.width / dpr : width;
  const realTexHeight = offscreenCanvas ? offscreenCanvas.height / dpr : height;
  gl.uniform1f(textureRatioLoc, width / realTexWidth);
  gl.uniform1f(textureHeightRatioLoc, height / realTexHeight);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(textureLoc, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  animationId.value = requestAnimationFrame(render);
}

function handleMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mousePosition.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function handleMouseEnter() {
  isMouseInCanvas.value = true;
}
function handleMouseLeave() {
  isMouseInCanvas.value = false;
}

function resizeCanvas() {
  /* ========== 容器尺寸监听与自适应 ========== */
  const container = containerRef.value;
  const canvas = canvasRef.value;
  if (!container || !canvas) return;

  // 获取父容器的实际宽高，确保填满 100%
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const dpr = window.devicePixelRatio || 1;

  canvasSize.value = { width, height };

  // 设置 Canvas 绘图缓冲区的实际像素大小
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // 设置 CSS 显示大小为容器 100%
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  if (gl) {
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  updateTexture();
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  initKeywords();
  initGL();
  resizeCanvas();

  resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
  });

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }

  animationId.value = requestAnimationFrame(render);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (animationId.value !== null) {
    cancelAnimationFrame(animationId.value);
  }
});
</script>

<style lang="scss" scoped>
.code-spotlight-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  border-radius: 6px;
  background: transparent;

  mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);

  .code-spotlight-canvas {
    display: block;
  }
}
</style>
