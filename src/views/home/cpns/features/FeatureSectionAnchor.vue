<template>
  <a id="features" class="feature-section-anchor" href="#features" aria-label="进入核心特性">
    <svg class="feature-section-anchor__arrow" viewBox="0 0 96 150" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="feature-section-arrow-shape">
          <path d="M31 4h34v86h23L48 146 8 90h23V4Z" />
        </clipPath>
        <linearGradient id="feature-section-arrow-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgb(255 255 255 / 0)" />
          <stop offset="0.5" stop-color="rgb(255 255 255 / 0.94)" />
          <stop offset="1" stop-color="rgb(255 255 255 / 0)" />
        </linearGradient>
      </defs>

      <path class="feature-section-anchor__body" d="M31 4h34v86h23L48 146 8 90h23V4Z" />
      <g clip-path="url(#feature-section-arrow-shape)">
        <rect class="feature-section-anchor__sweep" x="-8" y="-62" width="112" height="54" fill="url(#feature-section-arrow-light)" />
      </g>
      <path class="feature-section-anchor__outline" d="M31 4h34v86h23L48 146 8 90h23V4Z" />
    </svg>
  </a>
</template>

<style scoped lang="scss">
.feature-section-anchor {
  --arrow-fill: rgb(148 184 238 / 0.2);
  --arrow-edge: rgb(94 145 222 / 0.7);

  display: grid;
  width: clamp(76px, 8vw, 124px);
  min-height: 148px;
  margin: 0 auto clamp(34px, 5vw, 70px);
  place-items: center;
  color: var(--arrow-edge);
  text-decoration: none;
  scroll-margin-top: calc(var(--navbarHeight) + 28px);
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 3px solid rgb(94 145 222 / 0.72);
    outline-offset: 8px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      --arrow-fill: rgb(148 184 238 / 0.3);
      --arrow-edge: rgb(73 129 214 / 0.9);
    }
  }

  :where(html.dark) & {
    --arrow-fill: rgb(120 158 222 / 0.24);
    --arrow-edge: rgb(171 202 248 / 0.78);
  }

  &__arrow {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    filter: drop-shadow(0 8px 14px rgb(67 108 170 / 0.12));
  }

  &__body {
    fill: var(--arrow-fill);
    transition: fill 220ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  &__outline {
    fill: none;
    stroke: var(--arrow-edge);
    stroke-width: 2;
    stroke-linejoin: round;
    transition: stroke 220ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  &__sweep {
    opacity: 0.82;
    animation: feature-section-anchor-sweep 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
    animation-iteration-count: infinite;
  }
}

@keyframes feature-section-anchor-sweep {
  0% {
    transform: translateY(0);
    opacity: 0;
  }

  18%,
  72% {
    opacity: 0.9;
  }

  100% {
    transform: translateY(224px);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .feature-section-anchor {
    width: clamp(68px, 22vw, 92px);
    min-height: 116px;
    margin-bottom: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-section-anchor {
    &__sweep {
      animation: none;
      transform: translateY(116px);
      opacity: 0.62;
    }

    &__body,
    &__outline {
      transition: none;
    }
  }
}
</style>
