<template>
  <canvas ref="canvasRef" class="thinking-wave" :width="width" :height="height"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// const props = defineProps({
//   width: {
//     type: Number,
//     default: 60,
//   },
//   height: {
//     type: Number,
//     default: 30,
//   },
//   color: {
//     type: String,
//     default: '#409eff', // Element Plus Primary Color
//   },
// });

const {
  width = 60,
  height = 30,
  color = '#409eff',
} = defineProps<{
  width?: number;
  height?: number;
  color?: string;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;

// 波浪参数
let phase = 0; // 相位
const speed = 0.1; // 移动速度
const amplitude = 6; // 振幅（高度的一半左右）
const frequency = 0.2; // 频率

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 绘制参数
  const centerY = height / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // 绘制正弦波
  // y = A * sin(ωx + φ) + k
  for (let x = 0; x < width; x++) {
    // 核心公式：利用 phase 让波浪动起来
    const y = centerY + Math.sin(x * frequency + phase) * amplitude;

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  // 绘制第二条波浪（稍微错开一点，增加动感）
  ctx.beginPath();
  ctx.strokeStyle = adjustColorOpacity(color, 0.5);
  for (let x = 0; x < width; x++) {
    const y = centerY + Math.sin(x * frequency + phase + 2) * (amplitude - 2);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // 更新相位，让波浪移动
  phase += speed;

  // 核心：请求下一帧动画
  animationId = requestAnimationFrame(draw);
};

// 辅助函数：调整颜色透明度 (简单的 hex 转 rgba 实现，或者直接用 CSS 变量)
// 这里为了简单，假设传入的是 hex，仅做简易处理，或者直接依赖 CSS opacity
function adjustColorOpacity(hex: string, opacity: number) {
  // 简单处理 #RRGGBB
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hex;
}

onMounted(() => {
  draw();
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>

<style scoped>
.thinking-wave {
  display: block;
}
</style>
