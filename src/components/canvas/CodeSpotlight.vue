<template>
  <div ref="containerRef" class="code-spotlight-container">
    <canvas ref="canvasRef" class="code-spotlight-canvas" @mousemove="handleMouseMove" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"></canvas>
  </div>
</template>

<script lang="ts" setup>
interface KeywordItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

// Props 定义
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
    /** 自定义关键词列表，随机显示 */
    keywords?: string[];
  }>(),
  {
    scrollDirection: 'left',
    scrollSpeed: 0.3,
    spotlightRadius: 220,
    fontSize: 16,
    lineHeight: 34,
    spacing: 30,
    keywords: () => [
      'const',
      'function',
      'import',
      'export',
      'async',
      'await',
      'Vue',
      'ref',
      'computed',
      '=>',
      '{}',
      '</>',
      'return',
      'if',
      'else',
      'for',
      'let',
      'var',
      'class',
      'interface',
      'type',
      'npm',
      'git',
      'API',
      '[]',
      '()',
      '&&',
      '||',
    ],
  },
);

const BASE_BRIGHTNESS = 0.08;

// Refs
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const mousePosition = ref({ x: 0, y: 0 });
const isMouseInCanvas = ref(false);
const keywordGrid = ref<KeywordItem[]>([]);
const animationId = ref<number | null>(null);
const scrollOffset = ref(0);
const canvasSize = ref({ width: 0, height: 0 });
const singleLoopWidth = ref(0); // 单次循环的宽度

// 计算聚光灯位置：默认居中，hover 时跟随鼠标
const spotlightPosition = computed(() => {
  if (isMouseInCanvas.value) {
    return mousePosition.value;
  }
  // 默认居中
  return {
    x: canvasSize.value.width / 2,
    y: canvasSize.value.height / 2,
  };
});

// 计算渐变色：绿 -> 青 -> 蓝
function getGradientColor(distance: number, radius: number): string {
  const ratio = Math.min(distance / radius, 1);

  // 颜色节点
  const colors: any[] = [
    { pos: 0, r: 0, g: 255, b: 100 }, // 绿色
    { pos: 0.4, r: 0, g: 255, b: 200 }, // 青绿
    { pos: 0.7, r: 0, g: 200, b: 255 }, // 青色
    { pos: 1, r: 0, g: 136, b: 255 }, // 蓝色
  ];

  // 找到当前比例所在的颜色区间
  let startColor = colors[0];
  let endColor = colors[colors.length - 1];

  for (let i = 0; i < colors.length - 1; i++) {
    if (ratio >= colors[i].pos && ratio <= colors[i + 1]?.pos) {
      startColor = colors[i];
      endColor = colors[i + 1];
      break;
    }
  }

  // 在区间内插值
  const segmentRatio = (ratio - startColor.pos) / (endColor.pos - startColor.pos);
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * segmentRatio);
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * segmentRatio);
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * segmentRatio);

  return `rgb(${r}, ${g}, ${b})`;
}

// 计算亮度衰减（二次衰减）
function calculateBrightness(distance: number, radius: number): number {
  if (distance >= radius) return BASE_BRIGHTNESS;
  const normalizedDist = distance / radius;
  // 二次衰减，中心最亮
  return Math.max(BASE_BRIGHTNESS, 1 - normalizedDist * normalizedDist);
}

// 计算两点距离
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 生成单行关键词（用于无缝循环）
function generateSingleRow(ctx: CanvasRenderingContext2D, width: number): { items: Omit<KeywordItem, 'y'>[]; totalWidth: number } {
  const items: Omit<KeywordItem, 'y'>[] = [];
  let x = 0;

  // 生成足够宽度的关键词（至少比可视区域宽一点，用于无缝循环）
  while (x < width + 200) {
    const keyword = props.keywords[Math.floor(Math.random() * props.keywords.length)];
    const textWidth = ctx.measureText(keyword ?? '').width;

    items.push({
      text: keyword ?? '',
      x,
      width: textWidth,
    });

    x += textWidth + props.spacing;
  }

  return { items, totalWidth: x };
}

// 生成关键词网格
function generateKeywordGrid(width: number, height: number): KeywordItem[] {
  const grid: KeywordItem[] = [];
  const canvas = canvasRef.value;
  if (!canvas) return grid;

  const ctx = canvas.getContext('2d');
  if (!ctx) return grid;

  ctx.font = `${props.fontSize}px "MapleMono", monospace`;

  let y = props.lineHeight;
  let maxRowWidth = 0;

  while (y < height) {
    const { items, totalWidth } = generateSingleRow(ctx, width);
    maxRowWidth = Math.max(maxRowWidth, totalWidth);

    for (const item of items) {
      grid.push({
        ...item,
        y,
      });
    }

    y += props.lineHeight;
  }

  singleLoopWidth.value = maxRowWidth;
  return grid;
}

// 渲染函数
function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvasSize.value;
  if (width === 0 || height === 0) {
    animationId.value = requestAnimationFrame(render);
    return;
  }

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 更新滚动偏移（根据方向）
  const direction = props.scrollDirection === 'left' ? 1 : -1;
  scrollOffset.value += props.scrollSpeed * direction;

  // 处理循环（使用模运算）
  const loopW = singleLoopWidth.value;
  if (loopW > 0) {
    scrollOffset.value = ((scrollOffset.value % loopW) + loopW) % loopW;
  }

  // 设置字体
  ctx.font = `${props.fontSize}px "MapleMono", monospace`;
  ctx.textBaseline = 'middle';

  // 获取聚光灯位置
  const { x: spotX, y: spotY } = spotlightPosition.value;

  // 绘制每个关键词
  for (const item of keywordGrid.value) {
    // 计算滚动后的 x 位置
    let drawX = item.x - scrollOffset.value;

    // 如果超出左边界，加上循环宽度使其从右边进入
    if (drawX + item.width < 0 && loopW > 0) {
      drawX += loopW;
    }

    // 只绘制在可见范围内的关键词
    if (drawX > width + 10 || drawX + item.width < -10) continue;

    // 计算关键词中心点到聚光灯的距离
    const centerX = drawX + item.width / 2;
    const centerY = item.y;
    const distance = getDistance(centerX, centerY, spotX, spotY);

    // 计算亮度和颜色
    const brightness = calculateBrightness(distance, props.spotlightRadius);
    const color = getGradientColor(distance, props.spotlightRadius);

    // 设置透明度和颜色
    ctx.globalAlpha = brightness;
    ctx.fillStyle = color;

    // 绘制文字
    ctx.fillText(item.text, drawX, item.y);
  }

  // 重置透明度
  ctx.globalAlpha = 1;

  // 继续下一帧
  animationId.value = requestAnimationFrame(render);
}

// 处理鼠标移动
function handleMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  mousePosition.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

// 处理鼠标进入
function handleMouseEnter() {
  isMouseInCanvas.value = true;
}

// 处理鼠标离开
function handleMouseLeave() {
  isMouseInCanvas.value = false;
}

// 调整画布大小
function resizeCanvas() {
  const container = containerRef.value;
  const canvas = canvasRef.value;
  if (!container || !canvas) return;

  const { width, height } = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // 保存画布尺寸
  canvasSize.value = { width, height };

  // 设置实际像素大小（高清屏适配）
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // 设置 CSS 显示大小
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // 缩放上下文以适配 DPR
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }

  // 重新生成关键词网格
  keywordGrid.value = generateKeywordGrid(width, height);
}

// ResizeObserver 用于监听容器大小变化
let resizeObserver: ResizeObserver | null = null;

// 生命周期
onMounted(() => {
  resizeCanvas();

  // 使用 ResizeObserver 监听容器大小变化（比 window.resize 更精确）
  resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
  });

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }

  // 开始渲染循环
  animationId.value = requestAnimationFrame(render);
});

onUnmounted(() => {
  // 断开 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
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
  border-radius: 12px;
  background: transparent;

  // 四周渐变遮罩：左右渐隐
  mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);

  .code-spotlight-canvas {
    display: block;
    // cursor: crosshair;
  }
}
</style>
