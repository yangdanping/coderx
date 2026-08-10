<script setup lang="ts">
import type { Component } from 'vue';

import type { FeatureMeta } from './types/feature-section.type';

defineProps<{
  feature: FeatureMeta;
  demoComponent: Component;
  index: number;
  total: number;
  active: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  featureAction: [feature: FeatureMeta];
}>();
</script>

<template>
  <article class="feature-narrative" :class="[{ 'is-active': active, 'is-first': index === 0 }]" :aria-current="active ? 'step' : undefined">
    <div class="feature-narrative__mobile-demo">
      <component :is="demoComponent" :active="active" />
    </div>

    <div class="feature-narrative__copy">
      <p class="feature-narrative__position">{{ index + 1 }} / {{ total }}</p>
      <h2 class="feature-narrative__title">{{ feature.title }}</h2>
      <p class="feature-narrative__description">{{ feature.description }}</p>
      <button
        type="button"
        class="feature-narrative__action"
        :disabled="loading"
        :aria-busy="loading || undefined"
        @click="emit('featureAction', feature)"
      >
        <span>{{ loading ? 'Loading…' : feature.action.label }}</span>
        <span class="feature-narrative__action-arrow" aria-hidden="true">↗</span>
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.feature-narrative {
  width: min(100%, 620px);
  color: var(--text-primary);
  opacity: 0.28;
  transform: translate3d(0, 14px, 0);
  transition:
    opacity 260ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1);

  &.is-active {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  &.is-first {
    opacity: calc(0.18 + var(--feature-intro-progress, 1) * 0.82);
  }

  &__mobile-demo {
    display: none;
  }

  &__copy {
    max-width: 68ch;
  }

  &__position {
    margin: 0 0 clamp(18px, 2.2vw, 30px);
    color: var(--text-secondary);
    font-family: var(--markdown-editor-font);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  &__title {
    margin: 0;
    color: var(--text-primary);
    font-family: 'GeistPixel-Line', sans-serif;
    font-size: clamp(34px, 4vw, 58px);
    font-weight: 500;
    line-height: 1.08;
    letter-spacing: -0.025em;
    text-wrap: balance;
  }

  &__description {
    max-width: 42ch;
    margin: clamp(22px, 2.5vw, 34px) 0 0;
    color: var(--text-secondary);
    font-size: clamp(17px, 1.4vw, 20px);
    line-height: 1.85;
    text-wrap: pretty;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: 18px;
    min-height: 44px;
    margin-top: clamp(28px, 3vw, 44px);
    padding: 0 16px;
    color: var(--text-primary);
    font-family: var(--markdown-editor-font);
    font-size: 13px;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--text-secondary) 46%, transparent);
    border-radius: 6px;
    cursor: pointer;
    transition:
      color 180ms ease,
      background-color 180ms ease,
      border-color 180ms ease,
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1);

    &:hover:not(:disabled) {
      color: var(--bg-color-primary);
      background: var(--text-primary);
      border-color: var(--text-primary);
      transform: translate3d(0, -2px, 0);
    }

    &:focus-visible {
      outline: 2px solid var(--blue);
      outline-offset: 3px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.58;
    }
  }

  &__action-arrow {
    font-size: 16px;
    line-height: 1;
  }
}

@media (max-width: 900px) {
  .feature-narrative {
    width: 100%;
    opacity: 1;
    transform: none;

    &.is-first {
      opacity: 1;
    }

    &__mobile-demo {
      display: block;
      min-height: 360px;
      margin-bottom: 34px;
      padding: 18px;
      overflow: hidden;
      background: color-mix(in srgb, var(--glass-bg) 88%, transparent);
      border-radius: 12px;
      box-shadow: inset 0 0 0 1px var(--border-color-default);
    }

    &__title {
      font-size: clamp(30px, 8vw, 46px);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-narrative,
  .feature-narrative__action {
    transition: none;
  }
}
</style>
