<template>
  <RouterLink
    class="home-explore-link"
    :to="{ name: 'article' }"
    @blur="handleBlur"
    @focus="handleFocus"
    @pointercancel="handlePointerRelease"
    @pointerdown="handlePointerDown"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerRelease"
  >
    <canvas ref="canvas" class="home-explore-link__canvas" aria-hidden="true"></canvas>
    <span class="home-explore-link__label">Go Exploring ></span>
  </RouterLink>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';

type Point = {
  x: number;
  y: number;
};

type PaperPalette = {
  front: string;
  backLight: string;
  backDark: string;
  shadow: string;
  edge: string;
};

type CurlGeometry = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  hinge: Point;
  foot: Point;
  tip: Point;
  mid: Point;
  creaseCtrl: Point;
  sideHingeCtrl: Point;
  sideFootCtrl: Point;
};

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');

// 可调:静止时的弯折量(0~1),越大默认卷角越大。
const REST_OPENNESS = 0.4;
// 可调:hover / 键盘聚焦 / 触摸时的目标弯折量(展开后的最大卷角)。
const EXPANDED_OPENNESS = 0.8;
// 鼠标未悬停时的默认“触控点”(归一化 0~1),用于计算卷角朝向;0.5 即按钮中心。
const REST_POINTER: Point = { x: 0.5, y: 0.5 };
// 动画收敛阈值:当前值与目标差小于此值时停止 requestAnimationFrame。
const SETTLE_EPSILON = 0.001;
// 路径内缩边距(px),保证 1px 描边完全落在 canvas 位图内,不被裁切。
const EDGE_PAD = 1.5;
// 可调:纸面粗糙颗粒叠加强度(0~1),overlay 混合;越大纹理越明显。
const GRAIN_ALPHA = 0.5;

// A coarser sibling of the global --paper-noise (which stays untouched): more
// octaves plus a contrast boost give a more tactile fibre. It is desaturated to
// grey and composited with 'overlay', so it both darkens and lightens the slate
// paper instead of only adding dark speckles like the flat background grain.
const PAPER_GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='110' height='110'>" +
  "<filter id='g' x='0' y='0' width='100%' height='100%'>" +
  "<feTurbulence type='fractalNoise' baseFrequency='0.7 0.85' numOctaves='5' seed='17' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/>" +
  '<feComponentTransfer>' +
  "<feFuncR type='linear' slope='1.55' intercept='-0.27'/>" +
  "<feFuncG type='linear' slope='1.55' intercept='-0.27'/>" +
  "<feFuncB type='linear' slope='1.55' intercept='-0.27'/>" +
  '</feComponentTransfer>' +
  '</filter>' +
  "<rect width='110' height='110' filter='url(#g)'/></svg>";

let context: CanvasRenderingContext2D | null = null;
let grainImage: HTMLImageElement | null = null;
let grainPattern: CanvasPattern | null = null;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;
let reducedMotionQuery: MediaQueryList | null = null;
let prefersReducedMotion = false;
let usesWindowResizeFallback = false;
let canvasWidth = 0;
let canvasHeight = 0;
let currentOpenness = REST_OPENNESS;
let targetOpenness = REST_OPENNESS;
let currentPointer: Point = { ...REST_POINTER };
let targetPointer: Point = { ...REST_POINTER };
let isHovering = false;
let isFocused = false;
let isTouchPressed = false;
let animationFrameId: number | null = null;
let previousFrameTime = 0;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function distance(from: number, to: number) {
  return Math.abs(from - to);
}

function readCssColor(styles: CSSStyleDeclaration, property: string, fallback: string) {
  return styles.getPropertyValue(property).trim() || fallback;
}

function readPalette(canvas: HTMLCanvasElement): PaperPalette {
  const styles = getComputedStyle(canvas.parentElement ?? canvas);

  return {
    front: readCssColor(styles, '--note-paper', '#313850'),
    backLight: readCssColor(styles, '--note-paper-crease', '#46506e'),
    backDark: readCssColor(styles, '--note-paper-back', '#232a40'),
    shadow: readCssColor(styles, '--note-shadow', 'rgba(15, 21, 45, 0.42)'),
    edge: readCssColor(styles, '--note-edge', '#94b8ee'),
  };
}

// Bow a quadratic control point outward from the flap centroid so the curled
// edge reads as a rounded sheet instead of a flat triangle.
function bowControl(from: Point, to: Point, awayFrom: Point, amount: number): Point {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return {
    x: midX + (midX - awayFrom.x) * amount,
    y: midY + (midY - awayFrom.y) * amount,
  };
}

function calculateGeometry(width: number, height: number, openness: number, pointer: Point): CurlGeometry {
  const left = EDGE_PAD;
  const top = EDGE_PAD;
  const right = width - EDGE_PAD;
  const bottom = height - EDGE_PAD;

  // Size the dog-ear from the short side so a wide, short button still folds a
  // tidy proportional corner instead of a stretched sliver.
  // 可调:折角大小 = 短边 × 系数;0.26 = 静止时占比,0.72 = 完全展开时占比。
  const minSide = Math.min(right - left, bottom - top);
  const base = mix(minSide * 0.26, minSide * 0.72, openness);
  const lift = clamp(base + (pointer.y - 0.5) * minSide * 0.16 * openness, minSide * 0.18, minSide * 0.94);
  const reach = clamp(base + (pointer.x - 0.5) * minSide * 0.16 * openness, minSide * 0.18, minSide * 0.94);

  const hinge: Point = { x: right, y: bottom - lift };
  const foot: Point = { x: right - reach, y: bottom };
  const corner: Point = { x: right, y: bottom };
  const mid: Point = { x: (hinge.x + foot.x) / 2, y: (hinge.y + foot.y) / 2 };

  // Reflecting the corner across the crease gives the fully-folded tip; easing
  // it back toward the corner keeps a lifted curl rather than a flat fold.
  const flatTip: Point = { x: hinge.x + foot.x - corner.x, y: hinge.y + foot.y - corner.y };
  const curl = mix(0.66, 0.9, openness);
  const tip: Point = { x: mix(corner.x, flatTip.x, curl), y: mix(corner.y, flatTip.y, curl) };

  // Single crease curve shared by the face cut-out and the flap so the two
  // surfaces tile seamlessly (this is what kills the old "messy" overlap).
  const creaseCtrl: Point = { x: mix(mid.x, corner.x, 0.16), y: mix(mid.y, corner.y, 0.16) };

  const centroid: Point = {
    x: (hinge.x + foot.x + tip.x) / 3,
    y: (hinge.y + foot.y + tip.y) / 3,
  };

  return {
    left,
    top,
    right,
    bottom,
    hinge,
    foot,
    tip,
    mid,
    creaseCtrl,
    sideHingeCtrl: bowControl(hinge, tip, centroid, 0.16),
    sideFootCtrl: bowControl(tip, foot, centroid, 0.16),
  };
}

// Visible face: the rectangle with the folded corner cut away along the crease.
function traceFace(ctx: CanvasRenderingContext2D, geometry: CurlGeometry) {
  ctx.beginPath();
  ctx.moveTo(geometry.left, geometry.top);
  ctx.lineTo(geometry.right, geometry.top);
  ctx.lineTo(geometry.hinge.x, geometry.hinge.y);
  ctx.quadraticCurveTo(geometry.creaseCtrl.x, geometry.creaseCtrl.y, geometry.foot.x, geometry.foot.y);
  ctx.lineTo(geometry.left, geometry.bottom);
  ctx.closePath();
}

// Curled-up flap: hinge -> tip -> foot, closed back along the shared crease.
function traceFlap(ctx: CanvasRenderingContext2D, geometry: CurlGeometry) {
  ctx.beginPath();
  ctx.moveTo(geometry.hinge.x, geometry.hinge.y);
  ctx.quadraticCurveTo(geometry.sideHingeCtrl.x, geometry.sideHingeCtrl.y, geometry.tip.x, geometry.tip.y);
  ctx.quadraticCurveTo(geometry.sideFootCtrl.x, geometry.sideFootCtrl.y, geometry.foot.x, geometry.foot.y);
  ctx.quadraticCurveTo(geometry.creaseCtrl.x, geometry.creaseCtrl.y, geometry.hinge.x, geometry.hinge.y);
  ctx.closePath();
}

function drawPaper(openness = currentOpenness, pointer = currentPointer) {
  const canvas = canvasRef.value;
  const ctx = context;
  if (!canvas || !ctx || canvasWidth <= 0 || canvasHeight <= 0) return;

  const palette = readPalette(canvas);
  const geometry = calculateGeometry(canvasWidth, canvasHeight, openness, pointer);

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Flat front face.
  ctx.save();
  traceFace(ctx, geometry);
  ctx.fillStyle = palette.front;
  ctx.fill();
  ctx.restore();

  // 2. Curled flap: lit at the crease, shaded toward the tip, with a soft
  //    contact shadow cast back onto the face.
  ctx.save();
  ctx.shadowColor = palette.shadow;
  ctx.shadowBlur = mix(5, 13, openness);
  ctx.shadowOffsetX = -mix(1, 3, openness);
  ctx.shadowOffsetY = -mix(0.5, 2, openness);
  const sheen = ctx.createLinearGradient(geometry.mid.x, geometry.mid.y, geometry.tip.x, geometry.tip.y);
  sheen.addColorStop(0, palette.backLight);
  sheen.addColorStop(0.12, palette.backLight);
  sheen.addColorStop(1, palette.backDark);
  traceFlap(ctx, geometry);
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.restore();

  // 3. Rough paper grain, clipped to the note so it bends with the flap.
  if (grainPattern) {
    ctx.save();
    traceFace(ctx, geometry);
    ctx.clip();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = GRAIN_ALPHA;
    ctx.fillStyle = grainPattern;
    ctx.fillRect(geometry.left, geometry.top, geometry.right - geometry.left, geometry.bottom - geometry.top);
    ctx.restore();
  }

  // 4. Thin periwinkle outline hugging the face and the curled edge.
  ctx.save();
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  traceFace(ctx, geometry);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(geometry.hinge.x, geometry.hinge.y);
  ctx.quadraticCurveTo(geometry.sideHingeCtrl.x, geometry.sideHingeCtrl.y, geometry.tip.x, geometry.tip.y);
  ctx.quadraticCurveTo(geometry.sideFootCtrl.x, geometry.sideFootCtrl.y, geometry.foot.x, geometry.foot.y);
  ctx.stroke();
  ctx.restore();
}

function hasSettled() {
  return (
    distance(currentOpenness, targetOpenness) < SETTLE_EPSILON &&
    distance(currentPointer.x, targetPointer.x) < SETTLE_EPSILON &&
    distance(currentPointer.y, targetPointer.y) < SETTLE_EPSILON
  );
}

function applyTargetState() {
  currentOpenness = targetOpenness;
  currentPointer = { ...targetPointer };
}

function renderAnimationFrame(timestamp: number) {
  const elapsedFrames = previousFrameTime === 0 ? 1 : clamp((timestamp - previousFrameTime) / 16.67, 0.5, 4);
  // 可调:0.22 = 弯折动画阻尼/跟手系数(每帧向目标插值比例,越大越快越"脆")。
  const blend = 1 - Math.pow(1 - 0.22, elapsedFrames);
  previousFrameTime = timestamp;

  currentOpenness = mix(currentOpenness, targetOpenness, blend);
  currentPointer.x = mix(currentPointer.x, targetPointer.x, blend);
  currentPointer.y = mix(currentPointer.y, targetPointer.y, blend);

  if (hasSettled()) {
    applyTargetState();
    animationFrameId = null;
    previousFrameTime = 0;
    drawPaper();
    return;
  }

  drawPaper();
  animationFrameId = requestAnimationFrame(renderAnimationFrame);
}

function requestPaperUpdate() {
  if (prefersReducedMotion) {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    previousFrameTime = 0;
    applyTargetState();
    drawPaper();
    return;
  }

  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(renderAnimationFrame);
  }
}

function handleReducedMotionChange(event: MediaQueryListEvent) {
  prefersReducedMotion = event.matches;

  if (prefersReducedMotion) {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    previousFrameTime = 0;
    applyTargetState();
  }

  drawPaper();
}

function addReducedMotionListener(query: MediaQueryList) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleReducedMotionChange);
  } else {
    query.addListener(handleReducedMotionChange);
  }
}

function removeReducedMotionListener(query: MediaQueryList) {
  if (typeof query.removeEventListener === 'function') {
    query.removeEventListener('change', handleReducedMotionChange);
  } else {
    query.removeListener(handleReducedMotionChange);
  }
}

function updateInteractionTarget() {
  targetOpenness = isHovering || isFocused || isTouchPressed ? EXPANDED_OPENNESS : REST_OPENNESS;

  if (!isHovering) {
    targetPointer = { ...REST_POINTER };
  }

  requestPaperUpdate();
}

function handlePointerEnter(event: PointerEvent) {
  if (event.pointerType && event.pointerType !== 'mouse') return;
  isHovering = true;
  updateInteractionTarget();
}

function handlePointerMove(event: PointerEvent) {
  if (!isHovering || (event.pointerType && event.pointerType !== 'mouse')) return;
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  targetPointer = {
    x: clamp((event.clientX - rect.left) / rect.width, 0.28, 0.72),
    y: clamp((event.clientY - rect.top) / rect.height, 0.25, 0.75),
  };
  requestPaperUpdate();
}

function handlePointerLeave(event: PointerEvent) {
  if (event.pointerType && event.pointerType !== 'mouse') return;
  isHovering = false;
  updateInteractionTarget();
}

function handleFocus() {
  isFocused = true;
  updateInteractionTarget();
}

function handleBlur() {
  isFocused = false;
  updateInteractionTarget();
}

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse') return;
  isTouchPressed = true;
  updateInteractionTarget();
}

function handlePointerRelease(event: PointerEvent) {
  if (event.pointerType === 'mouse') return;
  isTouchPressed = false;
  updateInteractionTarget();
}

function resizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas || !context) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  canvas.width = Math.round(canvasWidth * dpr);
  canvas.height = Math.round(canvasHeight * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPaper();
}

function loadGrainTexture() {
  const ctx = context;
  if (!ctx || typeof Image === 'undefined') return;

  const image = new Image();
  grainImage = image;
  image.onload = () => {
    if (context !== ctx) return;
    grainPattern = ctx.createPattern(image, 'repeat');
    drawPaper();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PAPER_GRAIN_SVG)}`;
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  context = canvas.getContext('2d');
  if (!context) return;

  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion = reducedMotionQuery.matches;
  addReducedMotionListener(reducedMotionQuery);

  themeObserver = new MutationObserver(() => drawPaper());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  resizeCanvas();
  loadGrainTexture();

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement ?? canvas);
  } else {
    window.addEventListener('resize', resizeCanvas);
    usesWindowResizeFallback = true;
  }
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  resizeObserver?.disconnect();
  resizeObserver = null;
  themeObserver?.disconnect();
  themeObserver = null;

  if (usesWindowResizeFallback) {
    window.removeEventListener('resize', resizeCanvas);
    usesWindowResizeFallback = false;
  }

  if (grainImage) {
    grainImage.onload = null;
    grainImage = null;
  }
  grainPattern = null;

  context = null;
  if (reducedMotionQuery) {
    removeReducedMotionListener(reducedMotionQuery);
  }
  reducedMotionQuery = null;
  prefersReducedMotion = false;
});
</script>

<style lang="scss" scoped>
.home-explore-link {
  // ▼ Light mode: 白色模糊玻璃(卷角 canvas 用半透明白, 底衬 backdrop-filter)。
  --note-paper: rgba(255, 255, 255, 0.52); //         纸面正面色
  --note-paper-crease: rgba(255, 255, 255, 0.78); //  卷边折痕亮部
  --note-paper-back: rgba(235, 240, 250, 0.36); //    卷边尖端暗部
  --note-shadow: rgba(15, 21, 45, 0.12); //           卷角接触阴影
  --note-edge: rgba(148, 184, 238, 0.42); //          描边色
  --note-ink: #3a62a8; //                             文字色(浅底需加深)
  --note-focus: #5b7fc4; //                           键盘聚焦轮廓色

  // 只用 backdrop-filter; 不加 glass-bg 底色, 否则卷角透明区会露出矩形白块。
  background-color: transparent;
  backdrop-filter: var(--glass-blur);

  position: relative;
  display: inline-grid;
  box-sizing: border-box;
  // 可调:按钮宽度 clamp(最小, 自适应, 最大);min-height 即按钮高度。
  width: clamp(182px, 18vw, 200px);
  min-height: 46px;
  place-items: center;
  overflow: hidden;
  color: var(--note-ink);
  text-decoration: none;
  transform: rotate(-1deg);
  transform-origin: center;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid var(--note-focus);
    outline-offset: 5px;
  }

  &:active {
    transform: rotate(-0.4deg) translateY(1px) scale(0.99);
  }

  &__canvas {
    position: absolute;
    z-index: 0;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__label {
    position: relative;
    z-index: 1;
    padding-inline: 22px 50px;
    white-space: nowrap;
    font-family: 'GeistPixel-Line', 'MapleMono', monospace;
    font-size: clamp(14px, 1.1vw, 16px);
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }

  // ▼ Dark mode 调色板(深色页 plain 风格, 不使用玻璃底衬)。
  :where(html.dark) & {
    background-color: transparent;
    backdrop-filter: none;

    --note-paper: #232838;
    --note-paper-crease: #39415a;
    --note-paper-back: #191d2b;
    --note-shadow: rgba(0, 0, 0, 0.55);
    --note-edge: #94b8ee;
    --note-ink: #94b8ee;
    --note-focus: #94b8ee;
  }
}

@media (max-width: 420px) {
  .home-explore-link {
    width: min(216px, 76vw);

    &__label {
      font-size: 14px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-explore-link {
    transition-duration: 0.01ms;
  }
}
</style>
