<template>
  <article class="hot-user-card-item">
    <blockquote class="hot-user-card-item__quote">{{ quote }}</blockquote>

    <footer class="hot-user-card-item__author">
      <div class="hot-user-card-item__identity">
        <h3 class="hot-user-card-item__name">{{ displayName }}</h3>
        <span class="hot-user-card-item__role">社区作者</span>
      </div>
      <Avatar :info="item" :size="52" />
    </footer>

    <img class="bg" :src="item.avatarUrl" alt="" />
    <div class="bg-mask" aria-hidden="true"></div>
  </article>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import type { IUserInfo } from '@/stores/types/user.result';

const { item, quote } = defineProps<{
  item: IUserInfo;
  quote: string;
}>();

const displayName = computed(() => item.nickname?.trim() || item.name?.trim() || 'CoderX 作者');
</script>

<style lang="scss" scoped>
.hot-user-card-item {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 calc((100% - 32px) / 3);
  flex-direction: column;
  align-self: stretch;
  min-width: 240px;
  min-height: 230px;
  margin-right: 16px;
  padding: clamp(22px, 2.2vw, 30px);
  @include glass-effect;
  border: 1px solid rgba(216, 216, 216, 0.4);
  border-radius: var(--card-border-radius);
  transition:
    color 0.3s ease,
    border-color 0.3s ease;

  &:last-child {
    margin-right: 0;
  }

  &__quote {
    position: relative;
    z-index: var(--z-above);
    max-width: 30ch;
    margin: 0;
    color: var(--text-primary);
    font-size: clamp(15px, 1.2vw, 18px);
    font-weight: 500;
    line-height: 1.75;
    text-align: left;
    text-wrap: pretty;
    transition: color 0.3s ease;

    &::before {
      content: '“';
      display: block;
      height: 24px;
      color: color-mix(in srgb, var(--text-secondary) 58%, transparent);
      font-family: Georgia, serif;
      font-size: 38px;
      line-height: 1;
    }
  }

  &__author {
    position: relative;
    z-index: var(--z-above);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    width: 100%;
    margin-top: auto;
    padding-top: 24px;
  }

  &__identity {
    min-width: 0;
    text-align: right;
  }

  &__name {
    margin: 0;
    color: var(--text-primary);
    font-family: 'GeistPixel-Line', sans-serif;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.2;
    transition: color 0.3s ease;
  }

  &__role {
    display: block;
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.2;
    transition: color 0.3s ease;
  }

  .bg,
  .bg-mask {
    opacity: 0;
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    z-index: var(--z-below);
    pointer-events: none;
    transition: opacity 0.3s ease;
    overflow: hidden;
    border-radius: var(--card-border-radius);
  }

  .bg-mask {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: var(--glass-blur);
  }

  .bg {
    object-fit: cover;
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.34);

    .hot-user-card-item__quote,
    .hot-user-card-item__name {
      color: #f7f7f4;
    }

    .hot-user-card-item__role {
      color: rgba(247, 247, 244, 0.72);
    }

    .bg,
    .bg-mask {
      opacity: 1;
    }
  }
}

@media (max-width: 900px) {
  .hot-user-card-item {
    flex-basis: min(82vw, 360px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hot-user-card-item,
  .hot-user-card-item__quote,
  .hot-user-card-item__name,
  .hot-user-card-item__role,
  .hot-user-card-item .bg,
  .hot-user-card-item .bg-mask {
    transition: none;
  }
}
</style>
