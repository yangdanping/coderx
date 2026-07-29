<template>
  <component :is="props.as" :data-scramble-word="props.target" :aria-label="props.target" class="scramble-frame-text">
    <span
      v-for="(character, index) in characters"
      :key="index"
      class="scrambl-cell"
      :class="{
        'scramble-accent-character': index === accentIndex,
        'scramble-accent-outline': props.accentOutline && index === accentIndex,
      }"
      aria-hidden="true"
    >
      <svg
        v-if="props.accentOutline && index === accentIndex"
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

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    as?: string;
    frame: string;
    target: string;
    accentOutline?: boolean;
    accentGradientStartOffset?: string;
  }>(),
  {
    as: 'span',
    accentOutline: false,
    accentGradientStartOffset: '20%',
  },
);

const characters = computed(() => Array.from(props.frame));
const accentGradientId = `scramble-accent-${useId()}`;
const accentIndex = computed(() => {
  const targetLength = Array.from(props.target).length;

  return targetLength > 0 ? targetLength - 1 : -1;
});
</script>

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
