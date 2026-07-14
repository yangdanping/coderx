<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { createTriangle3DRuntime } from './triangle3d-runtime';

import type { Triangle3DRuntime } from './triangle3d-runtime';

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const isReady = shallowRef(false);
let runtime: Triangle3DRuntime | undefined;

onMounted(() => {
  if (!canvas.value) return;

  try {
    runtime = createTriangle3DRuntime(canvas.value, {
      onReady: () => {
        isReady.value = true;
      },
    });
  } catch {
    isReady.value = false;
  }
});

onUnmounted(() => {
  runtime?.dispose();
});
</script>

<template>
  <div class="background-triangle-3d" aria-hidden="true">
    <svg
      v-show="!isReady"
      class="background-triangle-3d__fallback"
      data-triangle-fallback
      viewBox="0 0 1400 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        d="M 165 580 L 270 580 Q275 578 270 570 L 223 483 Q220 480 217 483 L 165 570 Q160 578 165 580"
        fill="#f3b2ac"
        fill-opacity="0.5"
        stroke="#ee675c"
        stroke-opacity="0.8"
      />
    </svg>
    <canvas ref="canvas" class="background-triangle-3d__canvas" />
  </div>
</template>

<style scoped lang="scss">
.background-triangle-3d {
  position: fixed;
  z-index: -2;
  inset: 0;
  overflow: hidden;
  filter: var(--bg-filter);
  pointer-events: none;
  transition: filter 0.3s;
}

.background-triangle-3d__fallback,
.background-triangle-3d__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
