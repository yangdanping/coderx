<template>
  <a id="features" class="feature-section-anchor" href="#features" aria-label="进入核心特性">
    <svg class="feature-section-anchor__arrow" viewBox="0 0 140 116" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="feature-section-arrow-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgb(255 255 255 / 0.08)" />
          <stop offset="0.5" stop-color="rgb(255 255 255 / 0.96)" />
          <stop offset="1" stop-color="rgb(255 255 255 / 0.08)" />
        </linearGradient>
      </defs>

      <path class="feature-section-anchor__chevron feature-section-anchor__chevron--top" d="M16 16L70 64L124 16" />
      <path class="feature-section-anchor__chevron feature-section-anchor__chevron--bottom" d="M16 44L70 92L124 44" />
      <path class="feature-section-anchor__sweep feature-section-anchor__sweep--top" d="M16 16L70 64L124 16" />
      <path class="feature-section-anchor__sweep feature-section-anchor__sweep--bottom" d="M16 44L70 92L124 44" />
    </svg>
  </a>
</template>

<style scoped lang="scss">
.feature-section-anchor {
  --arrow-edge: rgb(94 145 222 / 0.62);

  display: grid;
  width: clamp(86px, 9vw, 138px);
  min-height: 116px;
  margin: 0 auto clamp(32px, 4vw, 56px);
  place-items: center;
  color: var(--arrow-edge);
  text-decoration: none;
  scroll-margin-top: calc(var(--navbarHeight) + 28px);
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: none;

    .feature-section-anchor__arrow {
      filter: drop-shadow(0 0 9px rgb(94 145 222 / 0.48));
      transform: translateY(2px) scale(1.04);
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      --arrow-edge: rgb(73 129 214 / 0.9);

      .feature-section-anchor__arrow {
        transform: translateY(3px);
      }
    }
  }

  :where(html.dark) & {
    --arrow-edge: rgb(171 202 248 / 0.78);
  }

  &__arrow {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    filter: drop-shadow(0 7px 12px rgb(67 108 170 / 0.12));
    transition:
      transform 220ms cubic-bezier(0.25, 1, 0.5, 1),
      filter 220ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  &__chevron,
  &__sweep {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__chevron {
    stroke: var(--arrow-edge);
    stroke-width: 4;
    transition: stroke 220ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  &__sweep {
    stroke: url('#feature-section-arrow-light');
    stroke-width: 5;
    stroke-dasharray: 34 190;
    stroke-dashoffset: 130;
    opacity: 0;
    animation: feature-section-anchor-sweep 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
    animation-iteration-count: infinite;

    &--bottom {
      animation-delay: 300ms;
    }
  }
}

@keyframes feature-section-anchor-sweep {
  0% {
    stroke-dashoffset: 130;
    opacity: 0;
  }

  18% {
    opacity: 0.94;
  }

  72% {
    opacity: 0.8;
  }

  100% {
    stroke-dashoffset: -130;
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .feature-section-anchor {
    width: clamp(78px, 26vw, 104px);
    min-height: 96px;
    margin-bottom: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-section-anchor {
    &__sweep {
      animation: none;
      stroke-dashoffset: 0;
      opacity: 0.54;
    }

    &__arrow,
    &__chevron {
      transition: none;
    }
  }
}
</style>
