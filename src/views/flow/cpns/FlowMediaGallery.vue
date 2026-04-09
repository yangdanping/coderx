<template>
  <div class="flow-media-gallery" :class="{ 'single-media': media.length === 1 }">
    <div class="media-viewport">
      <div class="media-track" :style="media.length > 2 ? { transform: translateX } : undefined">
        <div v-for="(item, idx) in media" :key="item.id" class="media-slot" :class="{ 'full-width': media.length === 1 }" role="button" @click="openPreview(idx)">
          <img :src="item.url" :alt="item.title" loading="lazy" decoding="async" />
        </div>
      </div>
    </div>

    <template v-if="showNav">
      <button class="nav-btn nav-prev" :class="{ disabled: !canPrev }" :disabled="!canPrev" @click.stop="prev" role="button" aria-label="上一张">
        <ChevronLeft :size="18" />
      </button>
      <button class="nav-btn nav-next" :class="{ disabled: !canNext }" :disabled="!canNext" @click.stop="next" role="button" aria-label="下一张">
        <ChevronRight :size="18" />
      </button>
      <span class="media-indicator">{{ indicator }}</span>
    </template>

    <Teleport to="body">
      <ElImageViewer v-if="previewVisible" :url-list="allUrls" :initial-index="previewInitialIndex" hide-on-click-modal @close="previewVisible = false" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ElImageViewer } from 'element-plus';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { FlowMedia } from '@/service/flow/flow.types';

const props = defineProps<{
  media: FlowMedia[];
}>();

const currentIndex = ref(0);
const showNav = computed(() => props.media.length > 2);

const canPrev = computed(() => currentIndex.value > 0);
const canNext = computed(() => currentIndex.value + 1 < props.media.length);

function prev() {
  if (canPrev.value) currentIndex.value--;
}
function next() {
  if (canNext.value) currentIndex.value++;
}

const translateX = computed(() => `translateX(-${currentIndex.value * 50}%)`);

const indicator = computed(() => {
  if (props.media.length <= 2) return '';
  const start = currentIndex.value + 1;
  const end = Math.min(currentIndex.value + 2, props.media.length);
  return `${start}-${end} / ${props.media.length}`;
});

const allUrls = computed(() => props.media.map((m) => m.url));
const previewVisible = ref(false);
const previewInitialIndex = ref(0);

function openPreview(index: number) {
  previewInitialIndex.value = index;
  previewVisible.value = true;
}
</script>
<style lang="scss" scoped>
.flow-media-gallery {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  container-type: inline-size;

  .media-viewport {
    width: 100%;
    overflow: hidden;
  }

  .media-track {
    display: flex;
    gap: 3px;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;

    .media-slot {
      flex: 0 0 calc(50% - 1.5px);
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: var(--bg-color-secondary);

      &.full-width {
        flex: 0 0 100%;
        aspect-ratio: 16 / 10;
        max-height: clamp(280px, 55cqi, 460px);
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);

        &:hover {
          transform: scale(1.03);
        }
      }
    }
  }

  &.single-media .media-track .media-slot {
    flex: 0 0 100%;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    color: #f0f0f0;
    backdrop-filter: blur(4px);
    transition:
      opacity 0.25s ease,
      background 0.25s ease;
    opacity: 0;
    z-index: var(--z-above);

    &:hover {
      background: rgba(0, 0, 0, 0.65);
    }

    &.disabled {
      opacity: 0 !important;
      pointer-events: none;
    }
  }

  &:hover .nav-btn:not(.disabled) {
    opacity: 1;
  }

  .nav-prev {
    left: 8px;
  }

  .nav-next {
    right: 8px;
  }

  .media-indicator {
    position: absolute;
    bottom: 8px;
    right: 10px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.3px;
    pointer-events: none;
  }

  @container (max-width: 360px) {
    .media-track .media-slot {
      aspect-ratio: 1 / 1;

      &.full-width {
        aspect-ratio: 4 / 3;
        max-height: 280px;
      }
    }

    .nav-btn {
      width: 28px;
      height: 28px;
    }
  }
}
</style>
