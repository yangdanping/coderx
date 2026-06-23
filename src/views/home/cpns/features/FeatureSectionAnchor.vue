<template>
  <a id="features" class="feature-section-anchor" href="#features" aria-label="进入核心特性">
    <svg class="feature-section-anchor__arrow" viewBox="0 0 140 116" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="feature-section-arrow-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="white" stop-opacity="0" />
          <stop offset="0.5" stop-color="white" stop-opacity="1" />
          <stop offset="1" stop-color="white" stop-opacity="0" />
        </linearGradient>
        <mask id="feature-section-arrow-sweep-mask" x="0" y="0" width="140" height="116" maskUnits="userSpaceOnUse" mask-type="alpha">
          <rect class="feature-section-anchor__sweep-band" x="0" y="-56" width="140" height="56" fill="url(#feature-section-arrow-light)" />
        </mask>
      </defs>

      <path class="feature-section-anchor__chevron feature-section-anchor__chevron--top" d="M16 16L70 64L124 16" />
      <path class="feature-section-anchor__chevron feature-section-anchor__chevron--bottom" d="M16 44L70 92L124 44" />
      <g class="feature-section-anchor__sweep" mask="url(#feature-section-arrow-sweep-mask)">
        <path class="feature-section-anchor__sweep-stroke" d="M16 16L70 64L124 16" />
        <path class="feature-section-anchor__sweep-stroke" d="M16 44L70 92L124 44" />
      </g>
    </svg>
  </a>
</template>

<style scoped lang="scss">
.feature-section-anchor {
  --arrow-edge: rgb(94 145 222 / 0.62);

  display: grid;
  width: clamp(58px, 5vw, 88px);
  min-height: 76px;
  margin: 0 auto clamp(24px, 3vw, 40px);
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
  &__sweep-stroke {
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
    pointer-events: none;
  }

  &__sweep-stroke {
    stroke: rgb(255 255 255 / 0.98);
    stroke-width: 6;
  }

  &__sweep-band {
    opacity: 0;
    animation: feature-section-anchor-sweep 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
    animation-iteration-count: infinite;
  }
}

@keyframes feature-section-anchor-sweep {
  0% {
    transform: translateY(0);
    opacity: 0;
  }

  14% {
    opacity: 1;
  }

  82% {
    opacity: 0.92;
  }

  100% {
    transform: translateY(172px);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .feature-section-anchor {
    width: clamp(58px, 18vw, 76px);
    min-height: 72px;
    margin-bottom: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-section-anchor {
    &__sweep-band {
      animation: none;
      transform: translateY(72px);
      opacity: 0.5;
    }

    &__arrow,
    &__chevron {
      transition: none;
    }
  }
}
</style>
