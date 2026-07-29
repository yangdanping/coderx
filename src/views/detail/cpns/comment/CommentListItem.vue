<template>
  <div class="comment-list-item">
    <Avatar :info="item.author" :size="32" />
    <div class="comment-box">
      <!-- 用户信息 -->
      <div class="user-info-box">
        <div class="comment-meta-primary">
          <div class="name">
            <span>{{ item.author?.name }}</span>
            <el-tag v-if="isAuthor(item.author?.id)" size="small">作者</el-tag>
          </div>
        </div>
        <div class="comment-meta-secondary">
          <span>{{ floor }}楼</span>
          <span aria-hidden="true">·</span>
          <span v-dateformat="item.createAt"></span>
        </div>
      </div>

      <!-- 评论内容 -->
      <div class="editor-content">
        <div ref="contentRef" class="editor-content-view" :style="item.status ? 'color: red' : ''" v-dompurify-html="item.content"></div>
        <CommentAction :comment="item" />
      </div>

      <!-- 回复表单 -->
      <CommentForm v-if="isReplying" :commentId="item.id" isReply @cancel="closeReplyForm" />

      <!-- 回复列表 -->
      <ReplyList :comment="item" :target-reply-id="targetReplyId ?? null" />
    </div>

    <!-- 工具栏 -->
    <CommentTools :comment="item" />
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import CommentAction from './CommentAction.vue';
import CommentForm from './CommentForm.vue';
import CommentTools from './CommentTools.vue';
import ReplyList from './ReplyList.vue';

import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import { codeHeightlight, renderCopyButtons } from '@/utils';

import type { IComment } from '@/service/comment/comment.request';

const { item, floor, targetReplyId } = defineProps<{
  item: IComment;
  floor?: number;
  targetReplyId?: number | null;
}>();

const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { isAuthor } = storeToRefs(articleStore);

// 评论内容容器引用
const contentRef = ref<HTMLElement | null>(null);

// 是否正在回复此评论
const isReplying = computed(() => commentStore.activeReplyId === item.id);

// 关闭回复表单
const closeReplyForm = () => {
  commentStore.setActiveReply(null);
};

// 代码高亮处理
watch(
  () => contentRef.value,
  (el) => {
    if (el) {
      nextTick(() => {
        codeHeightlight(el);
        renderCopyButtons(el);
      });
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.comment-list-item {
  display: flex;
  position: relative;
  margin-top: 20px;
  @include thin-border(bottom, var(--border-color-list));

  .comment-box {
    display: flex;
    flex: 1;
    width: auto;
    min-width: 0;
    flex-direction: column;
    margin-left: 10px;

    .user-info-box {
      display: flex;
      flex-direction: column;

      .comment-meta-primary {
        display: flex;
        align-items: center;
        margin-bottom: 5px;

        .name {
          display: flex;
          min-width: 0;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;

          span:not(.el-tag) {
            font-weight: 700;
            font-size: 20px;
          }
        }
      }

      .comment-meta-secondary {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
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

  @media (max-width: 992px) {
    display: grid;
    grid-template-columns: 32PX minmax(0, 1fr) 44PX;
    column-gap: 8PX;
    margin-top: 16px;

    > .avatar {
      grid-column: 1;
      grid-row: 1;
      align-self: start;
    }

    .comment-box {
      grid-column: 2 / -1;
      grid-row: 1;
      margin-left: 0;

      .user-info-box {
        min-height: 44PX;
        justify-content: center;
        padding-right: 44PX;

        .comment-meta-primary {
          min-height: 22PX;
          margin-bottom: 0;

          .name span:not(.el-tag) {
            font-size: 16PX;
            line-height: 1.4;
          }
        }

        .comment-meta-secondary {
          min-height: 20PX;
          font-size: 13PX;
        }
      }

      .editor-content {
        padding: 8px 0 4px;

        .editor-content-view {
          padding-inline: 0;
          font-size: 16PX;
        }
      }
    }

    > .comment-tools {
      grid-column: 3;
      grid-row: 1;
      justify-self: end;
    }
  }
}
</style>
