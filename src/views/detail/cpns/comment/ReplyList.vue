<template>
  <div class="reply-list" v-if="hasReplies">
    <div ref="replyListContainer" class="reply-list-container">
      <!-- 连线 -->
      <button
        v-show="isLineVisible"
        class="connection-line"
        type="button"
        aria-label="转到被回复的位置"
        data-reply-trace-control
        :style="lineStyle"
        @click.stop="scrollToParent"
      ></button>

      <!-- 预览回复（默认显示前2条） -->
      <template v-for="reply in displayedReplies" :key="reply.id">
        <div
          :ref="(el) => setItemRef(el, reply.id)"
          :id="getReplyElementId(reply.id)"
          class="reply-item-wrapper"
          :class="getReplyTraceClasses(reply.id)"
          tabindex="-1"
          @mouseenter="handleMouseEnter(reply.id)"
          @mouseleave="handleMouseLeave"
        >
          <ReplyItem
            :item="reply"
            :parentComment="comment"
            :trace-role="getReplyTraceRole(reply.id)"
            @scrollToParent="handleScrollToParent"
            @layout-change="scheduleLineUpdate"
          />
        </div>
      </template>
    </div>
    <p class="reply-trace-status" role="status" aria-live="polite">{{ traceStatus }}</p>

    <!-- 展开/折叠按钮 -->
    <div v-if="hasMoreReplies" class="expand-actions">
      <template v-if="!isExpanded">
        <button class="expand-btn" type="button" :aria-expanded="false" @click="expandReplies">
          查看更多 {{ remainingCount }} 条回复
          <el-icon aria-hidden="true"><ChevronDown /></el-icon>
        </button>
      </template>
      <template v-else>
        <!-- 加载更多回复 -->
        <template v-if="isFetchingNextPage">
          <el-icon class="is-loading"><Loader2 /></el-icon>
          <span>加载中…</span>
        </template>
        <template v-else-if="hasNextPage">
          <button class="expand-btn" type="button" @click="fetchNextPage()">
            加载更多回复
            <el-icon aria-hidden="true"><ChevronDown /></el-icon>
          </button>
        </template>

        <!-- 折叠按钮 -->
        <button class="collapse-btn" type="button" :aria-expanded="true" @click="collapseReplies">
          收起回复
          <el-icon aria-hidden="true"><ChevronUp /></el-icon>
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch, type CSSProperties } from 'vue';

import ReplyItem from './ReplyItem.vue';
import { useCommentLocator, useReplyList, flattenReplies } from '@/composables/useCommentList';
import { ChevronDown, ChevronUp, Loader2 } from '@lucide/vue';
import useCommentStore from '@/stores/comment.store';
import { Msg } from '@/utils';

import type { IComment } from '@/service/comment/comment.request';

const props = defineProps<{
  comment: IComment;
  targetReplyId?: number | null;
}>();

// 状态
const commentStore = useCommentStore();
const isExpanded = shallowRef(false);
const hoverReplyId = shallowRef<number | null>(null);
const itemRefs = new Map<number, HTMLElement>();
const isLineVisible = shallowRef(false);
const lineStyle = shallowRef<CSSProperties>({});
const locatedReplies = shallowRef<IComment[]>([]);
const traceStatus = shallowRef('');
const replyListContainer = useTemplateRef<HTMLElement>('replyListContainer');
let resizeObserver: ResizeObserver | null = null;
let lineUpdateFrame: number | null = null;

// 预览回复数据（来自一级评论接口）
const previewReplies = computed(() => props.comment.replies || []);
const replyCount = computed(() => props.comment.replyCount || 0);

// 是否有回复
const hasReplies = computed(() => replyCount.value > 0);

// 是否有更多回复需要展开
const hasMoreReplies = computed(() => replyCount.value > 2);

// 剩余未显示的回复数
const remainingCount = computed(() => Math.max(0, replyCount.value - 2));

// 展开时使用的完整回复列表
const commentId = computed(() => props.comment.id);
const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = useReplyList(commentId, 10, isExpanded);
const { locateComment } = useCommentLocator();

// 完整回复列表
const fullReplies = computed(() => flattenReplies(data.value));

const mergeLocatedReplies = (replies: IComment[]) => {
  if (!locatedReplies.value.length) return replies;

  const merged = new Map(replies.map((reply) => [reply.id, reply]));
  locatedReplies.value.forEach((reply) => merged.set(reply.id, reply));

  const firstTime = Date.parse(replies[0]?.createAt ?? '');
  const lastTime = Date.parse(replies.at(-1)?.createAt ?? '');
  const direction = Number.isFinite(firstTime) && Number.isFinite(lastTime) && firstTime > lastTime ? -1 : 1;
  return [...merged.values()].sort((a, b) => direction * (Date.parse(a.createAt) - Date.parse(b.createAt)));
};

// 显示的回复列表
const displayedReplies = computed(() => {
  let replies: IComment[];
  if (isExpanded.value) {
    // 展开时显示完整列表
    replies = fullReplies.value.length > 0 ? fullReplies.value : previewReplies.value;
  } else {
    // 未展开时只显示预览
    replies = previewReplies.value;
  }
  return mergeLocatedReplies(replies);
});

// 展开回复
const expandReplies = () => {
  isExpanded.value = true;
};

// 折叠回复
const collapseReplies = () => {
  isExpanded.value = false;
  if (commentStore.activeTrace?.commentId === commentId.value) {
    commentStore.clearActiveTrace();
  }
};

const completedTargetReplyScrolls = new Set<string>();
let isEnsuringTargetReply = false;
const targetReplyKey = computed(() => {
  if (props.targetReplyId == null) return '';
  return `${commentId.value}:${props.targetReplyId}`;
});

const hasDisplayedReply = (replyId: number) => displayedReplies.value.some((reply) => reply.id === replyId);
const getReplyElementId = (replyId: number) => `reply-${replyId}`;

const updateReplyHash = (replyId: number) => {
  const url = new URL(window.location.href);
  url.hash = getReplyElementId(replyId);
  window.history.replaceState(window.history.state, '', url);
};

const scrollToReplyElement = async (replyId: number) => {
  await nextTick();
  const replyEl = itemRefs.get(replyId);
  if (!replyEl) return false;

  const prefersReducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  replyEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  replyEl.focus({ preventScroll: true });
  updateReplyHash(replyId);
  return true;
};

const activateTrace = (sourceReplyId: number, targetReplyId: number) => {
  commentStore.setActiveTrace({
    commentId: commentId.value,
    sourceReplyId,
    targetReplyId,
  });
};

const scrollToReply = async (replyId: number) => {
  const reply = displayedReplies.value.find((item) => item.id === replyId);
  activateTrace(replyId, reply?.rid ?? replyId);
  const didScroll = await scrollToReplyElement(replyId);
  if (didScroll) {
    traceStatus.value = `已定位到 ${reply?.author?.name || '目标用户'} 的回复`;
  }
};

const ensureReplyAvailable = async (replyId: number) => {
  if (hasDisplayedReply(replyId)) return true;

  try {
    const reply = await locateComment(replyId);
    if (reply.cid !== commentId.value) {
      throw new Error('Reply does not belong to this comment thread');
    }

    locatedReplies.value = [...locatedReplies.value.filter((item) => item.id !== reply.id), reply];
    await nextTick();
    return hasDisplayedReply(replyId);
  } catch {
    traceStatus.value = '原回复已删除或暂时不可见';
    Msg.showInfo(traceStatus.value);
    return false;
  }
};

const ensureTargetReplyVisible = async () => {
  const replyId = props.targetReplyId;
  const key = targetReplyKey.value;
  if (replyId == null || !key || completedTargetReplyScrolls.has(key) || isEnsuringTargetReply) return;

  isEnsuringTargetReply = true;
  isExpanded.value = true;

  try {
    await nextTick();
    const isAvailable = await ensureReplyAvailable(replyId);

    if (props.targetReplyId !== replyId) return;

    if (isAvailable) {
      await scrollToReply(replyId);
    }
    completedTargetReplyScrolls.add(key);
  } finally {
    isEnsuringTargetReply = false;
  }
};

// ------------------------------------------------------
// 连线与高亮逻辑
// ------------------------------------------------------

const activeReplyId = computed(() => (commentStore.activeTrace?.commentId === commentId.value ? commentStore.activeTrace.sourceReplyId : null));
const currentFocusId = computed(() => hoverReplyId.value ?? activeReplyId.value);

// 设置 Ref
const setItemRef = (el: any, id: number) => {
  if (el) {
    const itemEl = el as HTMLElement;
    itemRefs.set(id, itemEl);
    resizeObserver?.observe(itemEl);
  } else {
    const previousItem = itemRefs.get(id);
    if (previousItem) resizeObserver?.unobserve(previousItem);
    itemRefs.delete(id);
  }
};

type ReplyTraceRole = 'source' | 'target' | null;

const currentTrace = computed(() => {
  const sourceReplyId = currentFocusId.value;
  if (!sourceReplyId) return null;

  const sourceReply = displayedReplies.value.find((reply) => reply.id === sourceReplyId);
  if (!sourceReply?.rid) return { sourceReplyId, targetReplyId: null };
  return { sourceReplyId, targetReplyId: sourceReply.rid };
});

const getReplyTraceRole = (replyId: number): ReplyTraceRole => {
  if (currentTrace.value?.sourceReplyId === replyId) return 'source';
  if (currentTrace.value?.targetReplyId === replyId) return 'target';
  return null;
};

const getReplyTraceClasses = (replyId: number) => {
  const role = getReplyTraceRole(replyId);
  return {
    'is-trace-source': role === 'source',
    'is-trace-target': role === 'target',
  };
};

// 事件处理（只有回复其他回复时才触发 hover，回复根评论不触发）
const handleMouseEnter = (id: number) => {
  const reply = displayedReplies.value.find((r) => r.id === id);
  // 只有 rid 有值（回复其他回复）时才设置 hover
  if (reply?.rid) {
    hoverReplyId.value = id;
  }
};

const handleMouseLeave = () => {
  hoverReplyId.value = null;
};

// 计算连线位置
const updateLinePosition = async () => {
  const focusId = currentFocusId.value;
  if (!focusId) {
    isLineVisible.value = false;
    return;
  }

  const reply = displayedReplies.value.find((r) => r.id === focusId);
  // 使用 rid 作为被回复的评论 ID
  const parentId = reply?.rid;

  // 如果没有 rid (回复的一级评论) 或 rid 不在当前列表中，不画线
  if (!parentId) {
    isLineVisible.value = false;
    return;
  }

  await nextTick();
  const focusEl = itemRefs.get(focusId);
  const parentEl = itemRefs.get(parentId);

  if (focusEl && parentEl) {
    const focusTop = focusEl.offsetTop;
    const focusHeight = focusEl.offsetHeight;
    const parentTop = parentEl.offsetTop;
    const parentHeight = parentEl.offsetHeight;

    const parentCenterY = parentTop + parentHeight / 2;
    const focusCenterY = focusTop + focusHeight / 2;

    const top = Math.min(parentCenterY, focusCenterY);
    const height = Math.abs(focusCenterY - parentCenterY);

    lineStyle.value = {
      top: `${top}px`,
      height: `${height}px`,
      left: `-20px`,
    };
    isLineVisible.value = true;
  } else {
    isLineVisible.value = false;
  }
};

const scheduleLineUpdate = () => {
  if (lineUpdateFrame != null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(lineUpdateFrame);
  }

  if (typeof requestAnimationFrame !== 'function') {
    void updateLinePosition();
    return;
  }

  lineUpdateFrame = requestAnimationFrame(() => {
    lineUpdateFrame = null;
    void updateLinePosition();
  });
};

watch([currentFocusId, displayedReplies], scheduleLineUpdate, { flush: 'post' });

watch(
  [targetReplyKey, displayedReplies, hasNextPage],
  () => {
    void ensureTargetReplyVisible();
  },
  { immediate: true, flush: 'post' },
);

// 从 ReplyItem 触发的滚动到父元素事件
const handleScrollToParent = async (replyId: number) => {
  // 查找被回复的评论
  const reply = displayedReplies.value.find((r) => r.id === replyId);
  const parentId = reply?.rid;

  if (parentId) {
    activateTrace(replyId, parentId);
    isExpanded.value = true;
    const isAvailable = await ensureReplyAvailable(parentId);
    if (isAvailable && (await scrollToReplyElement(parentId))) {
      const parentReply = displayedReplies.value.find((item) => item.id === parentId);
      traceStatus.value = `已定位到 ${parentReply?.author?.name || reply.replyTo?.name || '目标用户'} 的原回复`;
    }
  }
};

// 点击连线时滚动到父元素
const scrollToParent = () => {
  const focusId = currentFocusId.value;
  if (!focusId) return;
  void handleScrollToParent(focusId);
};

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return;

  resizeObserver = new ResizeObserver(scheduleLineUpdate);
  if (replyListContainer.value) resizeObserver.observe(replyListContainer.value);
  itemRefs.forEach((itemEl) => resizeObserver?.observe(itemEl));
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (lineUpdateFrame != null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(lineUpdateFrame);
  }
  lineUpdateFrame = null;
});
</script>

<style lang="scss" scoped>
.reply-list {
  margin-top: 10px;
  padding-inline-start: 16px;
  border-inline-start: 1px solid var(--comment-thread-rail);
}

.expand-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 0;
}

.expand-btn,
.collapse-btn {
  display: inline-flex;
  min-height: 44PX;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 14px;

  &:hover {
    color: var(--el-color-primary-light-3);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
    border-radius: 4px;
  }
}

.reply-trace-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.collapse-btn {
  color: var(--text-secondary);

  &:hover {
    color: var(--text-primary);
  }
}

.reply-list-container {
  position: relative;
}

.connection-line {
  position: absolute;
  width: 44PX;
  padding: 0;
  border: 0;
  background: transparent;
  z-index: var(--z-elevated);
  cursor: pointer;
  touch-action: manipulation;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 10PX;
    width: 2px;
    border-radius: 999px;
    background-color: var(--comment-trace-border);
    opacity: 0.62;
    transform: translateX(-50%);
    transition: opacity 0.18s ease;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 10PX;
    width: 2px;
    border-radius: 999px;
    background: linear-gradient(to bottom, transparent 0%, transparent 46%, var(--comment-trace-glow) 50%, transparent 54%, transparent 100%);
    background-repeat: no-repeat;
    background-size: 100% 220%;
    filter: drop-shadow(0 0 3px var(--comment-trace-glow));
    opacity: 0.58;
    pointer-events: none;
    transform: translateX(-50%);
    animation: comment-trace-flow 3s linear infinite;
  }

  &:hover::before,
  &:focus-visible::before {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@keyframes comment-trace-flow {
  0% {
    background-position: 0 145%;
    opacity: 0;
  }

  12%,
  88% {
    opacity: 0.58;
  }

  100% {
    background-position: 0 -145%;
    opacity: 0;
  }
}

.reply-item-wrapper {
  position: relative;
  border-radius: 4px;

  :deep(.reply-item) {
    transition:
      background-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  &.is-trace-source :deep(.reply-item) {
    background-color: var(--comment-trace-surface);
    box-shadow: inset 0 0 0 1px var(--comment-trace-border);
  }

  &.is-trace-target :deep(.reply-item) {
    background-color: var(--comment-trace-target-surface);
    box-shadow: inset 0 0 0 1px var(--comment-thread-rail);
  }

  &:focus-visible {
    outline: 2px solid var(--comment-trace-border);
    outline-offset: 3px;
  }
}

@media (max-width: 992px) {
  .reply-list {
    padding-inline-start: 10PX;
  }

  .expand-actions {
    padding-block: 4px;
  }

  .expand-btn,
  .collapse-btn {
    padding-inline: 8PX;
    font-size: 14PX;
  }

  .connection-line {
    min-height: 44PX;

    &::before,
    &::after {
      left: 8PX;
    }

    &::after {
      animation: none;
      opacity: 0;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .connection-line::after {
    animation: none;
    opacity: 0;
  }

  .connection-line::before,
  .reply-item-wrapper :deep(.reply-item) {
    transition: none;
  }
}
</style>
