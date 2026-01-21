<template>
  <div class="comment-list-item">
    <Avatar :info="item.author" />
    <div class="comment-box">
      <!-- 用户信息 -->
      <div class="user-info-box">
        <div class="user-info">
          <div class="name">
            <span>{{ item.author?.name }}</span>
            <el-tag v-if="isAuthor(item.author?.id)" size="small">作者</el-tag>
          </div>
        </div>
        <div class="floor">
          <span style="margin-right: 10px">{{ floor }}楼</span>
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
      <ReplyList :comment="item" />
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

const { item, floor } = defineProps<{
  item: IComment;
  floor?: number;
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
  @include thin-border(bottom, #eee);
  margin-top: 20px;
  position: relative;

  .comment-box {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
    width: 100%;

    .user-info-box {
      display: flex;
      flex-direction: column;

      .user-info {
        display: flex;
        align-items: center;
        margin-bottom: 5px;

        .name span:not(.el-tag) {
          font-weight: 700;
          font-size: 20px;
          margin-right: 5px;
        }
      }

      .floor {
        font-size: 13px;
      }
    }

    .editor-content {
      padding: 10px 0;
    }
  }
}
</style>
