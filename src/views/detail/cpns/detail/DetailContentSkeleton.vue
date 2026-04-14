<template>
  <div class="detail-content-skeleton" aria-hidden="true">
    <div class="content-layout">
      <div class="main-column">
        <div class="skeleton-card">
          <div class="author-info-block">
            <div class="sk-avatar pulse" />
            <div class="author-info-box">
              <div class="sk-name pulse" />
              <div class="sk-meta pulse" />
            </div>
          </div>

          <div class="sk-divider" />

          <div class="sk-title pulse" />

          <div class="sk-line sk-line--full pulse" />
          <div class="sk-line sk-line--wide pulse" />
          <div class="sk-line sk-line--medium pulse" />
          <div class="sk-line sk-line--full pulse" />
          <div class="sk-line sk-line--narrow pulse" />

          <div class="sk-block pulse" />

          <div class="sk-line sk-line--full pulse" />
          <div class="sk-line sk-line--wide pulse" />
          <div class="sk-line sk-line--medium pulse" />
        </div>
      </div>

      <div class="side-column hidden-sm-and-down">
        <div class="toc-card">
          <div class="sk-toc-title pulse" />
          <div class="sk-toc-line sk-toc-line--1 pulse" />
          <div class="sk-toc-line sk-toc-line--2 pulse" />
          <div class="sk-toc-line sk-toc-line--3 pulse" />
          <div class="sk-toc-line sk-toc-line--4 pulse" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$layout-gap: 20px;
$side-column-width: 220px;
$detail-content-padding: 24px;
$main-column-max-width: min(1100px, 60vw, calc(100vw - (#{$side-column-width} * 2) - (#{$layout-gap} * 2) - (#{$detail-content-padding} * 2)));

@keyframes pulse-shimmer {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.18;
  }
}

.detail-content-skeleton {
  width: 100%;
}

.pulse {
  animation: pulse-shimmer 1.6s ease-in-out infinite;
  background: color-mix(in oklch, var(--fontColor) 14%, transparent);
  border-radius: 10px;
}

.content-layout {
  display: grid;
  grid-template-columns: $side-column-width minmax(0, $main-column-max-width) $side-column-width;
  justify-content: center;
  align-items: start;
  column-gap: $layout-gap;
}

.main-column {
  grid-column: 2;
  min-width: 0;
}

.side-column {
  position: sticky;
  top: 80px;
  grid-column: 3;
  width: $side-column-width;
  min-width: 0;
}

.skeleton-card,
.toc-card {
  @include glass-effect;
}

.skeleton-card {
  padding: 24px;
}

.author-info-block {
  display: flex;
  align-items: center;
}

.sk-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  flex-shrink: 0;
}

.author-info-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  margin-left: 20px;
}

.sk-name {
  width: 140px;
  height: 24px;
}

.sk-meta {
  width: 88px;
  height: 12px;
}

.sk-divider {
  height: 1px;
  margin: 26px 0 40px;
  background: color-mix(in oklch, var(--fontColor) 10%, transparent);
}

.sk-title {
  width: min(420px, 58%);
  height: 42px;
  margin-bottom: 36px;
}

.sk-line {
  height: 14px;
  margin-bottom: 14px;

  &--full {
    width: 100%;
  }

  &--wide {
    width: 92%;
  }

  &--medium {
    width: 76%;
  }

  &--narrow {
    width: 54%;
  }
}

.sk-block {
  width: 100%;
  height: clamp(180px, 24vw, 280px);
  margin: 30px 0;
}

.toc-card {
  padding: 18px 16px;
}

.sk-toc-title {
  width: 92px;
  height: 16px;
  margin-bottom: 18px;
}

.sk-toc-line {
  height: 12px;
  margin-bottom: 12px;

  &--1 {
    width: 88%;
  }

  &--2 {
    width: 72%;
  }

  &--3 {
    width: 82%;
  }

  &--4 {
    width: 64%;
    margin-bottom: 0;
  }
}

@media (max-width: 992px) {
  .hidden-sm-and-down {
    display: none !important;
  }

  .content-layout {
    display: block;
  }

  .main-column {
    width: min(90%, 1000px);
    margin: 0 auto;
  }
}
</style>
