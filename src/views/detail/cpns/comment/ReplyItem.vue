<template>
  <div class="reply-item">
    <Avatar :info="item.author" :size="28" />
    <div class="reply-box">
      <!-- 用户信息 -->
      <div class="user-info-box">
        <div class="reply-meta-primary">
          <div class="name">
            <span>{{ item.author?.name }}</span>
            <el-tag v-if="isAuthor(item.author?.id)" size="small">作者</el-tag>
            <span v-if="traceRole" class="trace-role">
              {{ traceRole === 'source' ? '当前回复' : '原回复' }}
            </span>
          </div>
        </div>
        <div class="reply-meta-secondary">
          <span v-dateformat="item.createAt"></span>
        </div>
      </div>

      <ReplyQuote
        v-if="quotedContent && item.rid"
        :source-reply-id="item.id"
        :target-reply-id="item.rid"
        :reply-to-name="replyToName"
        :content="quotedContent"
        @navigate="emit('scrollToParent', $event)"
        @layout-change="emit('layoutChange')"
      />

      <!-- 回复内容 -->
      <div class="editor-content">
        <div ref="contentRef" class="editor-content-view" :style="item.status ? 'color: red' : ''" v-dompurify-html="item.content"></div>
        <CommentAction :comment="item" :parentCommentId="parentComment.id" />
      </div>

      <!-- 回复表单 -->
      <CommentForm v-if="isReplying" :commentId="parentComment.id" :replyId="item.id" isReply @cancel="closeReplyForm" />
    </div>

    <!-- 工具栏 -->
    <CommentTools :comment="item" :parentCommentId="parentComment.id" />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import Avatar from '@/components/avatar/Avatar.vue';
import CommentAction from './CommentAction.vue';
import CommentForm from './CommentForm.vue';
import CommentTools from './CommentTools.vue';
import ReplyQuote from './ReplyQuote.vue';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import { codeHeightlight } from '@/utils';

import type { IComment } from '@/service/comment/comment.request';

const props = defineProps<{
  item: IComment;
  parentComment: IComment; // 父级一级评论
  traceRole?: 'source' | 'target' | null;
}>();

const emit = defineEmits<{
  scrollToParent: [replyId: number];
  layoutChange: [];
}>();

const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { isAuthor } = storeToRefs(articleStore);

// ==================== 引用内容相关 ====================

const contentRef = ref<HTMLElement | null>(null);

// 被回复的用户名（只有回复其他回复时使用）
const replyToName = computed(() => props.item.replyTo?.name || null);

// 被引用的内容（只有回复其他回复时才显示，回复根评论不显示）
const quotedContent = computed(() => {
  // 如果 rid 为 null，说明回复的是根评论，不显示引用内容
  if (!props.item.rid) {
    return null;
  }
  // 回复其他回复时，使用 replyTo.content
  return props.item.replyTo?.content || null;
});

// 代码高亮处理
watch(
  () => contentRef.value,
  (contentEl) => {
    nextTick(() => {
      if (contentEl) codeHeightlight(contentEl);
    });
  },
  { immediate: true },
);

// ==================== 回复表单相关 ====================

// 是否正在回复此回复
const isReplying = computed(() => commentStore.activeReplyId === props.item.id);

// 关闭回复表单
const closeReplyForm = () => {
  commentStore.setActiveReply(null);
};
</script>

<style lang="scss" scoped>
.reply-item {
  display: flex;
  position: relative;
  background-color: var(--comment-reply-surface);
  box-shadow: var(--border-shadow-list-bottom);
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;

  .reply-box {
    display: flex;
    flex: 1;
    width: auto;
    min-width: 0;
    flex-direction: column;
    margin-left: 10px;

    .user-info-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 35px;

      .reply-meta-primary {
        display: flex;
        align-items: center;

        .name {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;

          span:not(.el-tag):not(.reply-to):not(.trace-role) {
            font-weight: 700;
            font-size: 15px;
          }
        }
      }

      .reply-meta-secondary {
        display: flex;
        align-items: center;
        min-height: 18px;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.5;
      }
    }

    .editor-content {
      padding: 10px 0;

      .editor-content-view {
        min-width: 0;
        overflow-wrap: anywhere;
      }
    }
  }
}

.trace-role {
  display: inline-flex;
  box-sizing: border-box;
  height: 17PX;
  align-items: center;
  padding: 0 5PX;
  border-radius: 999px;
  background-color: var(--comment-trace-label-bg);
  color: var(--comment-trace-label-text);
  font-size: 12PX;
  font-weight: 500;
  line-height: 1;
}

@media (max-width: 992px) {
  .reply-item {
    display: grid;
    grid-template-columns: 28PX minmax(0, 1fr) 44PX;
    column-gap: 8PX;
    margin-bottom: 6px;
    padding: 8px;

    > .avatar {
      grid-column: 1;
      grid-row: 1;
      align-self: start;
    }

    .reply-box {
      grid-column: 2 / -1;
      grid-row: 1;
      margin-left: 0;

      .user-info-box {
        min-height: 44PX;
        padding-right: 44PX;

        .reply-meta-primary {
          min-height: 22PX;
        }

        .reply-meta-secondary {
          min-height: 20PX;
          font-size: 12PX;
        }
      }

      .editor-content {
        padding: 6px 0 2px;

        .editor-content-view {
          padding-inline: 0;
          font-size: 15PX;
        }
      }
    }

    > .comment-tools {
      grid-column: 3;
      grid-row: 1;
      justify-self: end;
    }
  }

  .trace-role {
    height: 20PX;
    padding: 1PX 6PX;
    line-height: 1.4;
  }
}
</style>
