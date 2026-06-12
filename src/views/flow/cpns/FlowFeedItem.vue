<template>
  <article
    class="flow-feed-item"
    :class="{ 'is-navigable': navigable }"
  >
    <RouterLink
      v-if="navigable"
      class="item-detail-link"
      :to="{ name: 'flow-detail', params: { flowId: String(item.id) } }"
      :aria-label="`查看 ${item.author.name} 的动态详情`"
    />

    <header class="item-header">
      <div class="author-interactive excluded-from-detail" @click.stop>
        <el-avatar :src="item.author.avatarUrl" :size="40" class="author-avatar" />
        <div class="author-meta">
          <span class="author-name">{{ item.author.name }}</span>
          <time class="post-time" :datetime="item.createdAt">{{ timeAgo }}</time>
        </div>
      </div>
      <button class="more-btn excluded-from-detail" role="button" aria-label="更多操作" @click.stop>
        <MoreHorizontal :size="18" />
      </button>
    </header>

    <p class="item-body">{{ item.body }}</p>

    <div v-if="item.media.length > 0" class="media-interactive excluded-from-detail">
      <FlowMediaGallery :media="item.media" />
    </div>

    <footer class="item-actions">
      <button
        class="action-btn like-action excluded-from-detail"
        :class="{ active: liked, pop: isAnimating }"
        @click.stop="toggleLike"
        role="button"
      >
        <Heart :size="18" :fill="liked ? 'currentColor' : 'none'" />
        <span v-if="likeCount > 0">{{ likeCount }}</span>
      </button>
      <RouterLink
        v-if="navigable"
        class="action-btn comment-action excluded-from-detail"
        :to="{ name: 'flow-detail', params: { flowId: String(item.id) } }"
        aria-label="查看动态详情"
      >
        <MessageCircle :size="18" />
        <span v-if="item.comments > 0">{{ item.comments }}</span>
      </RouterLink>
      <span v-else class="action-btn comment-action">
        <MessageCircle :size="18" />
        <span v-if="item.comments > 0">{{ item.comments }}</span>
      </span>
      <button class="action-btn share-action excluded-from-detail" role="button" @click.stop>
        <Share2 :size="18" />
      </button>
    </footer>
  </article>
</template>
<script setup lang="ts">
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-vue-next';
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
const liked = ref(props.item.liked);
const likeCount = ref(props.item.likes);
const isAnimating = ref(false);

function toggleLike() {
  liked.value = !liked.value;
  likeCount.value += liked.value ? 1 : -1;
  if (liked.value) {
    isAnimating.value = true;
    setTimeout(() => (isAnimating.value = false), 500);
  }
}

const timeAgo = computed(() => dayjs(props.item.createdAt).fromNow());
</script>
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

    .more-btn {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--fontColor);
      transition: background 0.2s ease;

      &:hover {
        background: color-mix(in oklch, var(--fontColor) 8%, transparent);
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

  .item-actions {
    display: flex;
    gap: clamp(2px, 1cqi, 6px);
    margin-top: clamp(10px, 2cqi, 14px);

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: clamp(5px, 1cqi, 7px) clamp(8px, 2cqi, 14px);
      border: none;
      border-radius: 20px;
      background: transparent;
      color: var(--fontColor);
      font-size: clamp(12px, 2cqi, 14px);
      transition:
        background 0.2s ease,
        color 0.2s ease;
      user-select: none;

      &:hover {
        background: color-mix(in oklch, var(--fontColor) 8%, transparent);
      }

      &.active {
        color: var(--red, #ea3329);
      }

      &.pop {
        animation: like-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1);
      }

      span {
        min-width: 16px;
        text-align: left;
      }
    }
  }
}

@keyframes like-pop {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
</style>
