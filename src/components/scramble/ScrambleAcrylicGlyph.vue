<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    character: string;
    gradientStartOffset?: string;
    depthX?: number;
    depthY?: number;
  }>(),
  {
    gradientStartOffset: '20%',
    depthX: 5,
    depthY: 5,
  },
);

const layerProgress = [0.25, 0.5, 0.75, 1] as const;
const componentId = useId();
const gradientIds = {
  edge: `scramble-acrylic-edge-${componentId}`,
  face: `scramble-acrylic-face-${componentId}`,
  side: `scramble-acrylic-side-${componentId}`,
  highlight: `scramble-acrylic-highlight-${componentId}`,
};

const layerPosition = (progress: number) => ({
  x: 35 + props.depthX * progress,
  y: 86 + props.depthY * progress,
});
</script>

<template>
  <svg class="scramble-acrylic-glyph" viewBox="-8 -8 94 118" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">
    <defs>
      <linearGradient :id="gradientIds.edge" class="scramble-acrylic-edge-gradient" x1="15%" y1="15%" x2="85%" y2="85%">
        <stop class="scramble-acrylic-edge-start" :offset="props.gradientStartOffset" />
        <stop class="scramble-acrylic-edge-end" offset="100%" />
      </linearGradient>
      <linearGradient :id="gradientIds.face" class="scramble-acrylic-face-gradient" x1="8%" y1="0%" x2="92%" y2="100%">
        <stop class="scramble-acrylic-face-highlight" offset="0%" />
        <stop class="scramble-acrylic-face-start" :offset="props.gradientStartOffset" />
        <stop class="scramble-acrylic-face-end" offset="100%" />
      </linearGradient>
      <linearGradient :id="gradientIds.side" class="scramble-acrylic-side-gradient" x1="5%" y1="5%" x2="95%" y2="95%">
        <stop class="scramble-acrylic-side-start" :offset="props.gradientStartOffset" />
        <stop class="scramble-acrylic-side-end" offset="100%" />
      </linearGradient>
      <linearGradient :id="gradientIds.highlight" class="scramble-acrylic-highlight-gradient" x1="8%" y1="0%" x2="72%" y2="88%">
        <stop class="scramble-acrylic-highlight-start" offset="0%" />
        <stop class="scramble-acrylic-highlight-end" offset="72%" />
      </linearGradient>
    </defs>

    <g class="scramble-acrylic-volume">
      <text
        v-for="progress in layerProgress"
        :key="progress"
        class="scramble-acrylic-character scramble-acrylic-depth"
        :x="layerPosition(progress).x"
        :y="layerPosition(progress).y"
        font-size="100"
        text-anchor="middle"
        :fill="`url(#${gradientIds.side})`"
        :stroke="`url(#${gradientIds.edge})`"
      >
        {{ props.character }}
      </text>
      <text
        class="scramble-acrylic-character scramble-acrylic-face"
        x="35"
        y="86"
        font-size="100"
        text-anchor="middle"
        :fill="`url(#${gradientIds.face})`"
        :stroke="`url(#${gradientIds.edge})`"
      >
        {{ props.character }}
      </text>
      <text
        class="scramble-acrylic-character scramble-acrylic-highlight"
        x="34.35"
        y="85.2"
        font-size="100"
        text-anchor="middle"
        fill="none"
        :stroke="`url(#${gradientIds.highlight})`"
      >
        {{ props.character }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.scramble-acrylic-glyph {
  display: block;
  width: 100%;
  height: 1em;
  overflow: visible;
  transform-style: preserve-3d;
}

.scramble-acrylic-character {
  font-family: sans-serif;
  font-style: oblique;
  paint-order: stroke fill;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.scramble-acrylic-depth {
  opacity: 0.18;
  stroke-width: 1;
}

.scramble-acrylic-face {
  stroke-width: clamp(1px, 0.015em, 2px);
}

.scramble-acrylic-highlight {
  opacity: 0.72;
  stroke-width: 0.8;
}

.scramble-acrylic-edge-start,
.scramble-acrylic-face-start,
.scramble-acrylic-side-start {
  stop-color: var(--scramble-accent-gradient-start, currentColor);
}

.scramble-acrylic-edge-end,
.scramble-acrylic-face-end,
.scramble-acrylic-side-end {
  stop-color: var(--scramble-accent-gradient-end, currentColor);
}

.scramble-acrylic-face-highlight {
  stop-color: #fff;
  stop-opacity: 0.38;
}

.scramble-acrylic-face-start {
  stop-opacity: 0.08;
}

.scramble-acrylic-face-end {
  stop-opacity: 0.16;
}

.scramble-acrylic-side-start {
  stop-opacity: 0.07;
}

.scramble-acrylic-side-end {
  stop-opacity: 0.18;
}

.scramble-acrylic-highlight-start {
  stop-color: #fff;
  stop-opacity: 0.92;
}

.scramble-acrylic-highlight-end {
  stop-color: #fff;
  stop-opacity: 0;
}
</style>
