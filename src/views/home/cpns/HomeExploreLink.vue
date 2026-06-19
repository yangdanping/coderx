<template>
  <div class="home-explore-link">
    <span class="home-explore-link__ascii-shadow" aria-hidden="true">
      <span>░░░▒▒▒▓▓▓▓▓</span>
      <span class="home-explore-link__ascii-shadow-soft">░░▒▒▒▓▓▓▓▓▓</span>
    </span>

    <RouterLink class="home-explore-link__note" :to="{ name: 'article' }">
      <span class="home-explore-link__paper" aria-hidden="true"></span>
      <span class="home-explore-link__label">Start Exploring</span>
      <span class="home-explore-link__contact-shadow" aria-hidden="true"></span>
      <span class="home-explore-link__curl" aria-hidden="true"></span>
    </RouterLink>
  </div>
</template>

<style lang="scss" scoped>
.home-explore-link {
  --note-paper: #f3d66f;
  --note-paper-top: #f8df83;
  --note-paper-light: #fff1ac;
  --note-paper-deep: #dcb743;
  --note-paper-bottom: #edca5c;
  --note-ink: #303831;
  --note-focus: #3e7950;
  --note-ascii-shadow: rgba(50, 59, 54, 0.44);
  --curl-size: 26px;
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);

  position: relative;
  isolation: isolate;
  display: inline-block;
  width: fit-content;
  padding-bottom: 18px;

  &__note {
    position: relative;
    z-index: 2;
    display: grid;
    box-sizing: border-box;
    width: clamp(196px, 16vw, 220px);
    min-height: 64px;
    place-items: center;
    padding: 12px 27px 14px 21px;
    color: var(--note-ink);
    text-decoration: none;
    transform: rotate(-1.1deg);
    transform-origin: 50% 50%;
    transition: transform 260ms var(--ease-out-quint);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:focus-visible {
      outline: 3px solid var(--note-focus);
      outline-offset: 5px;
    }

    &:active {
      transform: rotate(-0.7deg) translateY(1px) scale(0.985);
    }
  }

  &__paper {
    position: absolute;
    z-index: 1;
    inset: 0;
    pointer-events: none;
    background:
      repeating-linear-gradient(0deg, rgba(105, 77, 18, 0.018) 0 1px, transparent 1px 4px),
      linear-gradient(112deg, rgba(255, 255, 255, 0.3), transparent 36%),
      linear-gradient(176deg, var(--note-paper-top) 0%, var(--note-paper) 58%, var(--note-paper-bottom) 100%);
    box-shadow:
      inset 0 0 0 1px rgba(112, 83, 21, 0.1),
      inset 0 -2px 0 rgba(126, 91, 18, 0.08);
    -webkit-mask-image: radial-gradient(circle var(--curl-size) at 100% 100%, transparent calc(100% - 1px), #000 100%);
    mask-image: radial-gradient(circle var(--curl-size) at 100% 100%, transparent calc(100% - 1px), #000 100%);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.62;
      background:
        linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22) 48%, transparent 53%) 37% 0 / 1px 100% no-repeat,
        linear-gradient(rgba(82, 65, 24, 0.055), rgba(82, 65, 24, 0.055)) 0 17px / 100% 1px no-repeat;
      mix-blend-mode: multiply;
    }
  }

  &__label {
    position: relative;
    z-index: 2;
    white-space: nowrap;
    font-family: 'GeistPixel-Line', 'MapleMono', monospace;
    font-size: clamp(14px, 1.1vw, 16px);
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }

  &__curl {
    position: absolute;
    z-index: 4;
    right: -1px;
    bottom: -1px;
    width: calc(var(--curl-size) * 1.08);
    height: calc(var(--curl-size) * 1.08);
    overflow: hidden;
    border-radius: 100% 0 0 0;
    pointer-events: none;
    filter:
      drop-shadow(-2px -2px 1.5px rgba(101, 73, 14, 0.2))
      drop-shadow(-5px -4px 5px rgba(83, 62, 18, 0.12));
    transform-origin: 100% 100%;
    transition: transform 280ms var(--ease-out-quint);

    &::before {
      content: '';
      position: absolute;
      right: -32%;
      bottom: -28%;
      width: 132%;
      height: 132%;
      border-radius: 50%;
      background: radial-gradient(
        ellipse at 30% 28%,
        #fff8d6 0 18%,
        var(--note-paper-light) 34%,
        #e8c45e 55%,
        var(--note-paper-deep) 73%,
        #9c7526 100%
      );
      box-shadow: inset 3px 3px 6px rgba(255, 255, 255, 0.65);
    }

    &::after {
      content: '';
      position: absolute;
      right: -8%;
      bottom: -12%;
      width: 83%;
      height: 70%;
      border-radius: 58% 0 0 0;
      background: var(--bg-color-primary);
      transform: rotate(-9deg);
    }
  }

  &__contact-shadow {
    position: absolute;
    z-index: 0;
    right: -7px;
    bottom: -7px;
    width: 38px;
    height: 17px;
    border-radius: 50%;
    pointer-events: none;
    opacity: 0.86;
    background: rgba(79, 64, 28, 0.24);
    filter: blur(6px);
    transform: rotate(-12deg);
    transition:
      opacity 180ms ease,
      transform 280ms var(--ease-out-quint);
  }

  &__ascii-shadow {
    position: absolute;
    z-index: 0;
    left: 14px;
    top: calc(100% - 23px);
    display: flex;
    flex-direction: column;
    width: 188px;
    pointer-events: none;
    color: var(--note-ascii-shadow);
    font-family: 'GeistPixel-Line', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 0.72;
    white-space: pre;
    filter: blur(0.15px);
    transform: skewX(-27deg) scaleY(0.74);
    transform-origin: top left;
    transition:
      opacity 180ms ease,
      transform 260ms var(--ease-out-quint);
  }

  &__ascii-shadow-soft {
    opacity: 0.5;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover &__note {
      transform: rotate(-1.8deg) translateY(-3px);
    }

    &:hover &__curl {
      transform: scale(1.72) rotate(-5deg);
    }

    &:hover &__contact-shadow {
      opacity: 0.65;
      transform: translate(-7px, -3px) rotate(-14deg) scale(1.25);
    }

    &:hover &__ascii-shadow {
      opacity: 0.74;
      transform: translate(3px, 5px) skewX(-27deg) scale(1.03, 0.8);
    }
  }

  &:focus-within &__note {
    transform: rotate(-1.8deg) translateY(-3px);
  }

  &:focus-within &__curl {
    transform: scale(1.72) rotate(-5deg);
  }

  &:focus-within &__contact-shadow {
    opacity: 0.65;
    transform: translate(-7px, -3px) rotate(-14deg) scale(1.25);
  }

  &:focus-within &__ascii-shadow {
    opacity: 0.74;
    transform: translate(3px, 5px) skewX(-27deg) scale(1.03, 0.8);
  }

  :where(html.dark) & {
    --note-paper: #d2b34f;
    --note-paper-top: #e4cb6b;
    --note-paper-light: #f4e49b;
    --note-paper-deep: #aa8429;
    --note-paper-bottom: #bd9634;
    --note-ink: #282a24;
    --note-focus: #9bd5a8;
    --note-ascii-shadow: rgba(210, 218, 211, 0.35);
  }
}

@media (hover: none) {
  .home-explore-link__curl {
    transform: scale(1.2);
  }
}

@media (max-width: 420px) {
  .home-explore-link {
    --curl-size: 24px;

    &__note {
      width: min(204px, 70vw);
      min-height: 58px;
    }

    &__label {
      font-size: 14px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-explore-link {
    &__note,
    &__curl,
    &__contact-shadow,
    &__ascii-shadow {
      transition-duration: 0.01ms;
    }
  }
}
</style>
