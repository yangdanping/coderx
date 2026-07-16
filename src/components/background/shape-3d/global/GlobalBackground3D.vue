<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { createGlobalBackground3DRuntime } from './global-background3d-runtime';

import type { GlobalBackground3DRuntime } from './global-background3d-runtime';

const emit = defineEmits<{
  readyChange: [ready: boolean];
}>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const isReady = shallowRef(false);
let runtime: GlobalBackground3DRuntime | undefined;
let unmounted = false;

function updateReady(ready: boolean, force = false) {
  if (unmounted || (!force && isReady.value === ready)) return;
  isReady.value = ready;
  emit('readyChange', ready);
}

onMounted(() => {
  if (!canvas.value) return;

  try {
    runtime = createGlobalBackground3DRuntime(canvas.value, {
      onReady: () => updateReady(true),
      onUnavailable: () => updateReady(false),
    });
  } catch {
    updateReady(false, true);
  }
});

onUnmounted(() => {
  unmounted = true;
  runtime?.dispose();
});
</script>

<template>
  <div class="global-background-3d" aria-hidden="true">
    <canvas ref="canvas" class="global-background-3d__canvas" :class="{ 'is-ready': isReady }" />
  </div>
</template>

<style scoped lang="scss">
.global-background-3d {
  position: fixed;
  z-index: -3;
  inset: 0;
  overflow: hidden;
  filter: var(--bg-filter);
  pointer-events: none;
  transition: filter 0.3s;
}

.global-background-3d__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s;
}

.global-background-3d__canvas.is-ready {
  opacity: 1;
}
</style>
