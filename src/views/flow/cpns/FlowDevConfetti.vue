<template>
  <canvas ref="canvasRef" class="flow-dev-confetti-canvas" aria-hidden="true" />
</template>

<script setup lang="ts">
/** 中心礼花：Canvas 物理粒子，落地后淡出（类似 🎊 氛围） */

import type { ConfettiParticle } from './types/flow-dev-confetti.type';

const COLORS = ['#ff6b9d', '#ffd93d', '#6bcb77', '#4d96ff', '#c084fc', '#ff8e53', '#f472b6', '#38bdf8'];
const GRAVITY = 0.42;
const GROUND_PAD = 24;
const FADE_AFTER_LAND_MS = 1400;
const BURST_COUNT = 72;
const EMOJI_MS = 520;

const canvasRef = ref<HTMLCanvasElement | null>(null);
let rafId = 0;
let particles: ConfettiParticle[] = [];
let lastTs = 0;
let emojiUntil = 0;

function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawnBurst() {
  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.48;
  particles = [];
  for (let i = 0; i < BURST_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 7 + Math.random() * 16;
    const w = 4 + Math.random() * 5;
    const h = 6 + Math.random() * 10;
    particles.push({
      x: cx + (Math.random() - 0.5) * 16,
      y: cy + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      w,
      h,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.28,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      landed: false,
      landTime: 0,
      opacity: 1,
    });
  }
  lastTs = performance.now();
  emojiUntil = lastTs + EMOJI_MS;
}

function drawEmoji(ctx: CanvasRenderingContext2D, now: number) {
  if (now > emojiUntil) return;
  const t = 1 - (emojiUntil - now) / EMOJI_MS;
  const scale = 0.5 + 0.85 * Math.sin((t * Math.PI) / 1);
  const alpha = Math.min(1, t * 3) * (1 - Math.max(0, t - 0.65) / 0.35);
  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.46;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${56 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎊', cx, cy);
  ctx.restore();
}

function tick(now: number) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dt = Math.min((now - lastTs) / 16.67, 2.2);
  lastTs = now;

  const groundY = window.innerHeight - GROUND_PAD;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawEmoji(ctx, now);

  let alive = false;

  for (const p of particles) {
    if (!p.landed) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      const half = Math.max(p.w, p.h) * 0.6;
      if (p.y + half >= groundY) {
        p.landed = true;
        p.landTime = now;
        p.y = groundY - half;
        p.vy = 0;
        p.vx *= 0.35;
        p.vr *= 0.4;
      }
    } else {
      p.opacity = Math.max(0, 1 - (now - p.landTime) / FADE_AFTER_LAND_MS);
    }

    if (p.opacity > 0.02) {
      alive = true;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  if (now < emojiUntil) alive = true;

  if (alive) {
    rafId = requestAnimationFrame(tick);
  } else {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = [];
  }
}

function burst() {
  if (prefersReducedMotion()) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  cancelAnimationFrame(rafId);
  resizeCanvas(canvas);
  spawnBurst();
  rafId = requestAnimationFrame(tick);
}

function onResize() {
  const canvas = canvasRef.value;
  if (!canvas || particles.length === 0) return;
  resizeCanvas(canvas);
}

onMounted(() => {
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  cancelAnimationFrame(rafId);
});

defineExpose({ burst });
</script>

<style lang="scss" scoped>
.flow-dev-confetti-canvas {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-sticky) + 2);
  pointer-events: none;
  display: block;
}
</style>
