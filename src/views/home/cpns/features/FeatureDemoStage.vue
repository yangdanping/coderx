<script setup lang="ts">
import type { Component } from 'vue';

import type { FeatureTransitionPhase } from './composables/useFeatureStoryMotion';

defineProps<{
  featureId: string;
  featureTitle: string;
  positionLabel: string;
  demoComponent: Component;
  phase: FeatureTransitionPhase;
  active: boolean;
}>();
</script>

<template>
  <div class="feature-demo-stage" :class="`is-${phase}`" aria-live="polite" aria-atomic="true">
    <div class="feature-demo-stage__bar">
      <span class="feature-demo-stage__label">Interactive preview</span>
      <span class="feature-demo-stage__position">{{ positionLabel }}</span>
    </div>
    <div :key="featureId" class="feature-demo-stage__viewport" :aria-label="`${featureTitle} 演示`">
      <component :is="demoComponent" :active="active" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.feature-demo-stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 460px;
  overflow: hidden;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--glass-bg) 88%, transparent);
  border-radius: 14px;
  box-shadow:
    0 2px 8px rgba(30, 45, 40, 0.12),
    inset 0 0 0 1px color-mix(in srgb, var(--border-color-default) 82%, transparent);

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 0 18px;
    color: var(--text-secondary);
    font-family: var(--markdown-editor-font);
    font-size: 12px;
    border-bottom: 1px solid var(--border-color-default);
  }

  &__label {
    color: var(--text-primary);
  }

  &__position {
    font-variant-numeric: tabular-nums;
  }

  &__viewport {
    flex: 1;
    min-height: 0;
    padding: clamp(18px, 2vw, 28px);
    overflow: hidden;
    transform-origin: center;
  }

  &.is-leaving &__viewport {
    animation: feature-demo-leave 180ms cubic-bezier(0.76, 0, 0.24, 1) both;
  }

  &.is-entering &__viewport {
    animation: feature-demo-enter 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}

@keyframes feature-demo-leave {
  to {
    opacity: 0;
    filter: blur(4px);
    transform: translate3d(0, -8px, 0) scale(0.985);
  }
}

@keyframes feature-demo-enter {
  from {
    opacity: 0;
    filter: blur(5px);
    transform: translate3d(0, 10px, 0) scale(0.985);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0) scale(1);
  }
}

:where(html.dark) .feature-demo-stage {
  background: color-mix(in srgb, var(--bg-color-secondary) 86%, transparent);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.32),
    inset 0 0 0 1px var(--border-color-default);
}

@media (prefers-reduced-motion: reduce) {
  .feature-demo-stage.is-leaving .feature-demo-stage__viewport,
  .feature-demo-stage.is-entering .feature-demo-stage__viewport {
    animation: none;
  }
}
</style>
