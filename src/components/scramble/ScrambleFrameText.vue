<script setup lang="ts">
import ScrambleAcrylicGlyph from './ScrambleAcrylicGlyph.vue';

const props = withDefaults(
  defineProps<{
    as?: string;
    frame: string;
    target: string;
    accentOutline?: boolean;
    accentAcrylic?: boolean;
    accentFollowPointer?: boolean;
    accentGradientStartOffset?: string;
    accentDefaultTiltX?: number;
    accentDefaultTiltY?: number;
    accentDepthX?: number;
    accentDepthY?: number;
    accentMaxPointerTilt?: number;
  }>(),
  {
    as: 'span',
    accentOutline: false,
    accentAcrylic: false,
    accentFollowPointer: false,
    accentGradientStartOffset: '20%',
    accentDefaultTiltX: -3,
    accentDefaultTiltY: 6,
    accentDepthX: 5,
    accentDepthY: 5,
    accentMaxPointerTilt: 7,
  },
);

const characters = computed(() => Array.from(props.frame));
const accentGradientId = `scramble-accent-${useId()}`;
const accentIndex = computed(() => {
  const targetLength = Array.from(props.target).length;

  return targetLength > 0 ? targetLength - 1 : -1;
});

const tiltX = shallowRef(props.accentDefaultTiltX);
const tiltY = shallowRef(props.accentDefaultTiltY);
const depthX = shallowRef(props.accentDepthX);
const depthY = shallowRef(props.accentDepthY);
let pointerFrameId: number | null = null;
let pendingPointer: { x: number; y: number } | null = null;
let finePointerQuery: MediaQueryList | null = null;
let reducedMotionQuery: MediaQueryList | null = null;
let isMounted = false;

const acrylicStyle = computed(() => ({
  '--scramble-acrylic-tilt-x': `${tiltX.value}deg`,
  '--scramble-acrylic-tilt-y': `${tiltY.value}deg`,
}));

function resetAcrylicOrientation() {
  tiltX.value = props.accentDefaultTiltX;
  tiltY.value = props.accentDefaultTiltY;
  depthX.value = props.accentDepthX;
  depthY.value = props.accentDepthY;
}

function cancelPendingPointerFrame() {
  pendingPointer = null;
  if (pointerFrameId === null) return;

  cancelAnimationFrame(pointerFrameId);
  pointerFrameId = null;
}

function resetAcrylicInteraction() {
  cancelPendingPointerFrame();
  resetAcrylicOrientation();
}

function canFollowPointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || !props.accentAcrylic || !props.accentFollowPointer) return false;

  const hasFinePointer = finePointerQuery?.matches ?? window.matchMedia('(pointer: fine)').matches;
  const prefersReducedMotion = reducedMotionQuery?.matches ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return hasFinePointer === true && prefersReducedMotion !== true;
}

function handleMotionCapabilityChange() {
  if (!canFollowPointer()) resetAcrylicInteraction();
}

function addMotionCapabilityListener(query: MediaQueryList) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleMotionCapabilityChange);
    return;
  }

  query.addListener?.(handleMotionCapabilityChange);
}

function removeMotionCapabilityListener(query: MediaQueryList) {
  if (typeof query.removeEventListener === 'function') {
    query.removeEventListener('change', handleMotionCapabilityChange);
    return;
  }

  query.removeListener?.(handleMotionCapabilityChange);
}

function startMotionCapabilityTracking() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || finePointerQuery || reducedMotionQuery) return;

  finePointerQuery = window.matchMedia('(pointer: fine)');
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  addMotionCapabilityListener(finePointerQuery);
  addMotionCapabilityListener(reducedMotionQuery);
}

function stopMotionCapabilityTracking() {
  if (finePointerQuery) removeMotionCapabilityListener(finePointerQuery);
  if (reducedMotionQuery) removeMotionCapabilityListener(reducedMotionQuery);
  finePointerQuery = null;
  reducedMotionQuery = null;
}

function syncPointerTracking() {
  if (!isMounted) return;

  if (props.accentAcrylic && props.accentFollowPointer) {
    startMotionCapabilityTracking();
    handleMotionCapabilityChange();
    return;
  }

  stopMotionCapabilityTracking();
  resetAcrylicInteraction();
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

function roundOrientation(value: number) {
  return Math.round(value * 1000) / 1000;
}

function applyPendingPointer() {
  pointerFrameId = null;
  if (!pendingPointer) return;

  const { x, y } = pendingPointer;
  pendingPointer = null;
  tiltX.value = roundOrientation(props.accentDefaultTiltX - y * props.accentMaxPointerTilt);
  tiltY.value = roundOrientation(props.accentDefaultTiltY + x * props.accentMaxPointerTilt);
  depthX.value = roundOrientation(props.accentDepthX - x * 1.5);
  depthY.value = roundOrientation(props.accentDepthY - y * 1.5);
}

function handlePointerMove(event: PointerEvent) {
  if (!canFollowPointer()) return;

  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const bounds = target.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return;

  pendingPointer = {
    x: clampUnit(((event.clientX - bounds.left) / bounds.width) * 2 - 1),
    y: clampUnit(((event.clientY - bounds.top) / bounds.height) * 2 - 1),
  };
  if (pointerFrameId === null) {
    pointerFrameId = requestAnimationFrame(applyPendingPointer);
  }
}

function handlePointerLeave() {
  resetAcrylicInteraction();
}

watch(
  () => [props.accentDefaultTiltX, props.accentDefaultTiltY, props.accentDepthX, props.accentDepthY],
  resetAcrylicInteraction,
);

watch(() => [props.accentAcrylic, props.accentFollowPointer], syncPointerTracking);

onMounted(() => {
  isMounted = true;
  syncPointerTracking();
});

onBeforeUnmount(() => {
  isMounted = false;
  stopMotionCapabilityTracking();
  cancelPendingPointerFrame();
});
</script>

<template>
  <component
    :is="props.as"
    :data-scramble-word="props.target"
    :aria-label="props.target"
    class="scramble-frame-text"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
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
        :depth-x="depthX"
        :depth-y="depthY"
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
  transition: transform 160ms cubic-bezier(0.25, 1, 0.5, 1);
  will-change: transform;
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

@media (prefers-reduced-motion: reduce) {
  .scramble-accent-acrylic :deep(.scramble-acrylic-glyph) {
    transition: none;
  }
}
</style>
