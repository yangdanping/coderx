<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue';
import { CornerDownRight } from '@lucide/vue';

import { codeHeightlight } from '@/utils';

const COLLAPSE_HEIGHT = 96;

const props = defineProps<{
  sourceReplyId: number;
  targetReplyId: number;
  replyToName?: string | null;
  content: string;
}>();

const emit = defineEmits<{
  navigate: [sourceReplyId: number];
  layoutChange: [];
}>();

const quotedBodyRef = useTemplateRef<HTMLElement>('quotedBody');
const isCollapsed = shallowRef(true);
const needsCollapse = shallowRef(false);
let quoteResizeObserver: ResizeObserver | null = null;

const targetReplyHref = computed(() => `#reply-${props.targetReplyId}`);
const quotedBodyId = computed(() => `quoted-reply-${props.sourceReplyId}`);

const updateContentOverflow = () => {
  if (!quotedBodyRef.value) return;
  needsCollapse.value = quotedBodyRef.value.scrollHeight > COLLAPSE_HEIGHT;
};

const refreshQuotedContent = async () => {
  await nextTick();
  updateContentOverflow();
  if (quotedBodyRef.value) codeHeightlight(quotedBodyRef.value);
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  nextTick(() => emit('layoutChange'));
};

onMounted(async () => {
  await refreshQuotedContent();
  if (quotedBodyRef.value && typeof ResizeObserver !== 'undefined') {
    quoteResizeObserver = new ResizeObserver(updateContentOverflow);
    quoteResizeObserver.observe(quotedBodyRef.value);
  }
});

onUnmounted(() => {
  quoteResizeObserver?.disconnect();
  quoteResizeObserver = null;
});

watch(
  () => props.content,
  () => {
    void refreshQuotedContent();
  },
);
</script>

<template>
  <div class="quoted-reply">
    <div class="quoted-wrapper">
      <div class="quoted-header">
        <span class="quoted-author">{{ replyToName }} 的回复</span>
        <a
          class="quoted-jump"
          data-reply-trace-control
          :href="targetReplyHref"
          :aria-label="`定位 ${replyToName || '该用户'} 的原回复`"
          @click.prevent.stop="emit('navigate', sourceReplyId)"
        >
          <span>定位原回复</span>
          <CornerDownRight aria-hidden="true" />
        </a>
      </div>

      <div :id="quotedBodyId" ref="quotedBody" class="quoted-body" :class="{ 'is-collapsed': isCollapsed && needsCollapse }">
        <div class="quoted-content editor-content-view" v-dompurify-html="content"></div>
        <div v-if="isCollapsed && needsCollapse" class="collapse-overlay"></div>
      </div>

      <div v-if="needsCollapse" class="collapse-toggle">
        <button class="toggle-text" type="button" :aria-expanded="!isCollapsed" :aria-controls="quotedBodyId" @click.stop="toggleCollapse">
          {{ isCollapsed ? '展开引用' : '收起引用' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.quoted-reply {
  margin: 8px 0;
}

.quoted-wrapper {
  border: 1px solid var(--comment-thread-rail);
  border-radius: 6px;
  padding: 10px 12px;
  background-color: var(--comment-quote-surface);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--comment-trace-target-surface);
  }
}

.quoted-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  @include thin-border(bottom, var(--border-color-list));
}

.quoted-author {
  font-size: 13px;
  font-weight: 600;
}

.quoted-jump {
  display: inline-flex;
  min-width: 44PX;
  min-height: 44PX;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 auto;
  color: var(--el-color-primary);
  font-size: 12px;
  text-decoration: none;

  svg {
    width: 14px;
    height: 14px;
    transform: rotate(180deg);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
    border-radius: 4px;
  }
}

.quoted-body {
  position: relative;
  overflow: hidden;

  &.is-collapsed {
    max-height: 96px;
  }
}

.quoted-content {
  font-size: 13px;
  line-height: 1.6;

  :deep(p) {
    margin: 4px 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
  }
}

.collapse-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 60px;
  background: linear-gradient(to bottom, transparent, var(--comment-quote-surface) 78%);
  pointer-events: none;
}

.collapse-toggle {
  margin-top: 8px;
  text-align: center;
}

.toggle-text {
  min-width: 44PX;
  min-height: 44PX;
  padding: 4px 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 992px) {
  .quoted-reply {
    margin: 4px 0;
  }

  .quoted-wrapper {
    padding: 4px 8px;
    border: 0;
    border-inline-start: 1px solid var(--comment-thread-rail);
    border-radius: 0;
    background: transparent;
  }

  .quoted-header {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 2px 8px;
    margin-bottom: 2px;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .quoted-author {
    min-height: 24PX;
    display: inline-flex;
    align-items: center;
    font-size: 12PX;
  }

  .quoted-jump {
    margin-block: -10px;
    font-size: 12PX;
  }

  .quoted-content {
    font-size: 13PX;
    overflow-wrap: anywhere;
  }

  .collapse-toggle {
    margin-top: 0;
    text-align: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quoted-wrapper,
  .quoted-jump {
    transition: none;
  }
}
</style>
