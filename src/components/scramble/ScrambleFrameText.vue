<script setup lang="ts">
import ScrambleAcrylicGlyph from './ScrambleAcrylicGlyph.vue';

const props = withDefaults(
  defineProps<{
    as?: string;
    frame: string;
    target: string;
    accentOutline?: boolean;
    accentAcrylic?: boolean;
    accentGradientStartOffset?: string;
    accentTiltX?: number;
    accentTiltY?: number;
    accentDepthX?: number;
    accentDepthY?: number;
  }>(),
  {
    as: 'span',
    accentOutline: false,
    accentAcrylic: false,
    accentGradientStartOffset: '20%',
    accentTiltX: -3,
    accentTiltY: 6,
    accentDepthX: 5,
    accentDepthY: 5,
  },
);

const characters = computed(() => Array.from(props.frame));
const accentGradientId = `scramble-accent-${useId()}`;
const accentIndex = computed(() => {
  const targetLength = Array.from(props.target).length;

  return targetLength > 0 ? targetLength - 1 : -1;
});

const acrylicStyle = computed(() => ({
  '--scramble-acrylic-tilt-x': `${props.accentTiltX}deg`,
  '--scramble-acrylic-tilt-y': `${props.accentTiltY}deg`,
}));
</script>

<template>
  <component :is="props.as" :data-scramble-word="props.target" :aria-label="props.target" class="scramble-frame-text">
    <span
      v-for="(character, index) in characters"
      :key="index"
      class="scrambl-cell"
      :class="{
        'scramble-accent-character': index === accentIndex,
        'scramble-accent-outline': props.accentOutline && index === accentIndex,
        'scramble-accent-acrylic': props.accentAcrylic && index === accentIndex,
      }"
      :style="props.accentAcrylic && index === accentIndex ? acrylicStyle : undefined"
      aria-hidden="true"
    >
      <ScrambleAcrylicGlyph
        v-if="props.accentAcrylic && index === accentIndex"
        :character="character"
        :gradient-start-offset="props.accentGradientStartOffset"
        :depth-x="props.accentDepthX"
        :depth-y="props.accentDepthY"
      />
      <svg
        v-else-if="props.accentOutline && index === accentIndex"
        class="scramble-outline-glyph"
        viewBox="0 0 70 100"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient :id="accentGradientId" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop class="scramble-outline-gradient-start" :offset="props.accentGradientStartOffset" />
            <stop class="scramble-outline-gradient-end" offset="100%" />
          </linearGradient>
        </defs>
        <text
          class="scramble-outline-character"
          x="35"
          y="86"
          font-size="100"
          text-anchor="middle"
          fill="none"
          :stroke="`url(#${accentGradientId})`"
        >
          {{ character }}
        </text>
      </svg>
      <template v-else>{{ character }}</template>
    </span>
  </component>
</template>

<style scoped>
.scramble-frame-text {
  white-space: pre-wrap;
}

.scrambl-cell {
  align-items: center;
  display: inline-flex;
  height: 1em;
  justify-content: center;
  line-height: 1;
  width: 1ch;
  max-width: 1ch;
  overflow: hidden;
  text-align: center;
  vertical-align: middle;
}

.scramble-outline-glyph {
  display: block;
  width: 100%;
  height: 1em;
  overflow: visible;
}

.scramble-accent-acrylic :deep(.scramble-acrylic-glyph) {
  transform: perspective(420px) rotateX(var(--scramble-acrylic-tilt-x)) rotateY(var(--scramble-acrylic-tilt-y));
  transform-box: fill-box;
  transform-origin: center;
}

.scramble-outline-gradient-start {
  stop-color: var(--scramble-accent-gradient-start, currentColor);
}

.scramble-outline-gradient-end {
  stop-color: var(--scramble-accent-gradient-end, currentColor);
}

.scramble-outline-character {
  font-family: sans-serif;
  font-style: oblique;
  stroke-width: clamp(1px, 0.015em, 2px);
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

</style>
