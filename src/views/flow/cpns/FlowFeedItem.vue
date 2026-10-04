<script setup lang="ts">
import FlowMediaGallery from './FlowMediaGallery.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

import type { FlowItem } from '@/service/flow/flow.types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const props = withDefaults(
  defineProps<{
    item: FlowItem;
    navigable?: boolean;
  }>(),
  {
    navigable: true,
  },
);

const navigable = computed(() => props.navigable);
const timeAgo = computed(() => dayjs(props.item.createdAt).fromNow());
</script>

<template>
  <article class="flow-feed-item" :class="{ 'is-navigable': navigable }">
    <RouterLink v-if="navigable" class="item-detail-link" :to="{ name: 'flow-detail', params: { flowId: String(item.id) } }" :aria-label="`查看 ${item.author.name} 的动态详情`" />

    <header class="item-header">
      <div class="author-interactive excluded-from-detail" @click.stop>
        <el-avatar :src="item.author.avatarUrl" :size="40" class="author-avatar" />
        <div class="author-meta">
          <span class="author-name">{{ item.author.name }}</span>
          <time class="post-time" :datetime="item.createdAt">{{ timeAgo }}</time>
        </div>
      </div>
    </header>

    <div v-if="item.bodyHtml.trim()" class="item-body" v-dompurify-html="item.bodyHtml" />
    <p v-else class="item-body">{{ item.body }}</p>

    <div v-if="item.media.length > 0" class="media-interactive excluded-from-detail">
      <FlowMediaGallery :media="item.media" />
    </div>
  </article>
</template>

<style lang="scss" scoped>
.flow-feed-item {
  position: relative;
  padding: 20px 0;
  container-type: inline-size;
  outline: none;

  &.is-navigable {
    cursor: var(--cursorPointer);
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    z-index: calc(var(--z-above) + 2);
    width: 100%;
    height: 1.5px;
    pointer-events: none;
    background: linear-gradient(90deg, #43c3ff, #afffe3);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.5s ease-out;
  }

  &.is-navigable:hover::after {
    transform: scaleX(1);
  }

  .item-detail-link {
    position: absolute;
    inset: 0;
    z-index: var(--z-above);
    outline: none;

    &:focus-visible {
      box-shadow: inset 3px 0 0 color-mix(in oklch, var(--fontColor) 45%, transparent);
    }
  }

  .excluded-from-detail {
    position: relative;
    z-index: calc(var(--z-above) + 1);
  }

  & + & {
    border-top: 1px solid color-mix(in oklch, var(--fontColor) 12%, transparent);
  }

  .item-header {
    display: flex;
    align-items: center;
    gap: clamp(8px, 2cqi, 12px);
    margin-bottom: clamp(10px, 2.5cqi, 14px);

    .author-interactive {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: clamp(8px, 2cqi, 12px);
    }

    .author-avatar {
      flex-shrink: 0;
    }

    .author-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;

      .author-name {
        font-weight: 600;
        color: var(--text-primary);
        font-size: clamp(13px, 2.2cqi, 16px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .post-time {
        font-size: clamp(11px, 1.8cqi, 13px);
        color: color-mix(in oklch, var(--fontColor) 65%, transparent);
      }
    }
  }

  .item-body {
    margin: 0 0 clamp(10px, 2.5cqi, 16px);
    font-size: clamp(13.5px, 2.2cqi, 15.5px);
    line-height: 1.65;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
