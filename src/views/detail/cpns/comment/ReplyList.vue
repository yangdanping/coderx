<template>
  <div class="reply-list" v-if="hasReplies">
    <div class="reply-list-container">
      <!-- 连线 -->
      <div v-show="isLineVisible" class="connection-line" :style="lineStyle" @click="scrollToParent"></div>

      <!-- 预览回复（默认显示前2条） -->
      <template v-for="reply in displayedReplies" :key="reply.id">
        <div
          :ref="(el) => setItemRef(el, reply.id)"
          class="reply-item-wrapper"
          :class="{ 'is-highlighted': isHighlighted(reply.id) }"
          @mouseenter="handleMouseEnter(reply.id)"
          @mouseleave="handleMouseLeave"
        >
          <ReplyItem :item="reply" :parentComment="comment" @scrollToParent="handleScrollToParent" />
        </div>
      </template>
    </div>

    <!-- 展开/折叠按钮 -->
    <div v-if="hasMoreReplies" class="expand-actions">
      <template v-if="!isExpanded">
        <span class="expand-btn" @click="expandReplies">
          查看更多 {{ remainingCount }} 条回复
          <el-icon><IArrowDown /></el-icon>
        </span>
      </template>
      <template v-else>
        <!-- 加载更多回复 -->
        <template v-if="isFetchingNextPage">
          <el-icon class="is-loading"><ILoading /></el-icon>
          <span>加载中...</span>
        </template>
        <template v-else-if="hasNextPage">
          <span class="expand-btn" @click="fetchNextPage()">
            加载更多回复
            <el-icon><IArrowDown /></el-icon>
          </span>
        </template>

        <!-- 折叠按钮 -->
        <span class="collapse-btn" @click="collapseReplies">
          收起回复
          <el-icon><IArrowUp /></el-icon>
        </span>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ReplyItem from './ReplyItem.vue';
import { useReplyList, flattenReplies } from '@/composables/useCommentList';
import type { IComment } from '@/service/comment/comment.request';
import { ref, computed, watch, nextTick, onMounted, onUnmounted, type CSSProperties } from 'vue';

const props = defineProps<{
  comment: IComment;
}>();

// 状态
const isExpanded = ref(false);
const activeReplyId = ref<number | null>(null);
const hoverReplyId = ref<number | null>(null);
const itemRefs = new Map<number, HTMLElement>();
const isLineVisible = ref(false);
const lineStyle = ref<CSSProperties>({});

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

// 完整回复列表
const fullReplies = computed(() => flattenReplies(data.value));

// 显示的回复列表
const displayedReplies = computed(() => {
  if (isExpanded.value) {
    // 展开时显示完整列表
    return fullReplies.value.length > 0 ? fullReplies.value : previewReplies.value;
  }
  // 未展开时只显示预览
  return previewReplies.value;
});

// 展开回复
const expandReplies = () => {
  isExpanded.value = true;
};

// 折叠回复
const collapseReplies = () => {
  isExpanded.value = false;
  activeReplyId.value = null;
};

// ------------------------------------------------------
// 连线与高亮逻辑
// ------------------------------------------------------

const currentFocusId = computed(() => activeReplyId.value || hoverReplyId.value);

// 设置 Ref
const setItemRef = (el: any, id: number) => {
  if (el) {
    itemRefs.set(id, el);
  } else {
    itemRefs.delete(id);
  }
};

// 判断是否高亮 (当前项 或 被回复的项)
const highlightIds = computed(() => {
  const focusId = currentFocusId.value;
  if (!focusId) return new Set<number>();

  const ids = new Set<number>();
  ids.add(focusId);

  // 找到父级 ID
  const reply = displayedReplies.value.find((r) => r.id === focusId);
  const parentId = reply?.rid;
  if (parentId) {
    ids.add(parentId);
  }
  return ids;
});

const isHighlighted = (id: number) => highlightIds.value.has(id);

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

// 全局点击清除 active 状态
const globalClickListener = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const isQuotedReply = target.closest('.quoted-reply');
  const isLine = target.closest('.connection-line');

  // 只有点击引用区域或连线时保持 active，其他地方点击清除
  if (!isQuotedReply && !isLine) {
    activeReplyId.value = null;
  }
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
      left: `-13px`,
    };
    isLineVisible.value = true;
  } else {
    isLineVisible.value = false;
  }
};

watch(currentFocusId, updateLinePosition);

// 从 ReplyItem 触发的滚动到父元素事件
const handleScrollToParent = (replyId: number) => {
  // 设置 active 状态
  activeReplyId.value = replyId;

  // 查找被回复的评论
  const reply = displayedReplies.value.find((r) => r.id === replyId);
  const parentId = reply?.rid;

  if (parentId) {
    const parentEl = itemRefs.get(parentId);
    parentEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// 点击连线时滚动到父元素
const scrollToParent = () => {
  const focusId = currentFocusId.value;
  if (!focusId) return;
  handleScrollToParent(focusId);
};

onMounted(() => {
  document.addEventListener('click', globalClickListener);
});

onUnmounted(() => {
  document.removeEventListener('click', globalClickListener);
});
</script>

<style lang="scss" scoped>
.reply-list {
  margin-top: 10px;
  padding-left: 10px;
  border-left: 3px solid #a8d9b6;
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
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    color: #66b1ff;
  }
}

.collapse-btn {
  color: #909399;

  &:hover {
    color: #606266;
  }
}

.reply-list-container {
  position: relative;
}

.connection-line {
  position: absolute;
  width: 4px;
  background: linear-gradient(to top, #66b1ff 0%, #66b1ff 40%, rgba(255, 255, 255, 0.9) 50%, #66b1ff 60%, #66b1ff 100%);
  background-size: 100% 300%;
  animation: flowing-light 1.5s linear infinite;
  transition: all 0.2s ease;
  z-index: 100;
  cursor: pointer;

  &:hover {
    width: 6px;
    left: -13px !important; // Override inline style slightly
    background-color: #409eff;
    animation-duration: 1s;
  }
}

@keyframes flowing-light {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 0% 100%;
  }
}

.reply-item-wrapper {
  position: relative;
  border-radius: 4px;
  transition: all 0.3s ease;

  &.is-highlighted {
    /* &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      pointer-events: none;
    } */
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -13px;
      right: 0;
      transform: translateY(-50%);
      width: 14px;
      height: 4px;
      background-color: #66b1ff;
      pointer-events: none;
    }
  }
}
</style>
