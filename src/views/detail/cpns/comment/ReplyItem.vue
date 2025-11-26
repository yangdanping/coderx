<template>
  <div class="reply-item">
    <Avatar :info="item.author" :size="35" />
    <div class="reply-box">
      <!-- 用户信息 -->
      <div class="user-info-box">
        <div class="user-info">
          <div class="name">
            <span>{{ item.author?.name }}</span>
            <el-tag v-if="isAuthor(item.author?.id)" size="small">作者</el-tag>
            <template v-if="replyToName">
              <span class="reply-to">回复:</span>
              <span>{{ replyToName }}</span>
              <el-tag v-if="isAuthor(item.replyTo?.id)" size="small">作者</el-tag>
            </template>
          </div>
        </div>
        <div class="floor">
          <span v-dateformat="item.createAt"></span>
        </div>
      </div>

      <!-- 回复内容 -->
      <div class="editor-content">
        <div class="editor-content-view" :style="item.status ? 'color: red' : ''" v-dompurify-html="item.content"></div>
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
import Avatar from '@/components/avatar/Avatar.vue';
import CommentAction from './CommentAction.vue';
import CommentForm from './CommentForm.vue';
import CommentTools from './CommentTools.vue';

import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';

import type { IComment } from '@/service/comment/comment.request';

const props = defineProps<{
  item: IComment;
  parentComment: IComment; // 父级一级评论
}>();

const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { isAuthor } = storeToRefs(articleStore);

// 被回复的用户名
const replyToName = computed(() => {
  // 如果是回复一级评论，显示一级评论的作者
  // 如果是回复的回复，显示被回复者
  if (props.item.replyTo?.name) {
    return props.item.replyTo.name;
  }
  // 如果没有 replyTo 信息但有 rid，说明是回复一级评论
  if (!props.item.rid) {
    return props.parentComment.author?.name;
  }
  return null;
});

// 是否正在回复此回复
const isReplying = computed(() => commentStore.activeReplyId === props.item.id);

// 关闭回复表单
const closeReplyForm = () => {
  commentStore.setActiveReply(null);
};
</script>

<style lang="scss" scoped>
@use '@/assets/css/editor';

.reply-item {
  display: flex;
  position: relative;
  background-image: var(--blockBg);
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;

  .reply-box {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
    width: 100%;

    .user-info-box {
      display: flex;
      align-items: center;
      padding-top: 5px;
      flex-wrap: wrap;

      .user-info {
        display: flex;
        align-items: center;

        .name {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;

          span:not(.el-tag):not(.reply-to) {
            font-weight: 700;
            font-size: 15px;
          }

          .reply-to {
            color: #909399;
            margin-left: 8px;
          }
        }
      }

      .floor span {
        margin-left: 10px;
        font-size: 10px;
        color: #909399;
      }
    }

    .editor-content {
      padding: 10px 0;
    }
  }
}
</style>
