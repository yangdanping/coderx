<template>
  <div class="comment-form" :class="{ 'is-reply': isReply }">
    <Avatar v-if="!isReply" :info="userInfo" />
    <div class="input">
      <!--
        取消 / 提交按钮通过 #actions slot 交给 TiptapEditorComment，
        与编辑器的"Aa"工具栏切换按钮同处底部工具条，避免 CommentForm 再用 absolute 悬浮定位。
      -->
      <TiptapEditorComment @update:content="(valueHtml) => (content = valueHtml)">
        <template #actions>
          <el-button v-if="isReply" @click="handleCancel" type="default" plain size="small">取消</el-button>
          <el-button :disabled="isSubmitting || !content" :loading="isSubmitting" @click="handleSubmit" type="primary" :size="isReply ? 'small' : 'default'">
            {{ isSubmitting ? '提交中' : isReply ? '回复' : '发送' }}
          </el-button>
        </template>
      </TiptapEditorComment>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import TiptapEditorComment from '@/components/tiptap-editor-comment/TiptapEditorComment.vue';
import { Msg, emitter } from '@/utils';
import { useRoute } from 'vue-router';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import { useAddComment, useAddReply } from '@/composables/useCommentList';

const props = defineProps<{
  commentId?: number; // 一级评论ID（回复时使用）
  replyId?: number; // 被回复的回复ID（回复的回复时使用）
  isReply?: boolean; // 是否为回复模式
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const route = useRoute();
const userStore = useUserStore();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { userInfo } = storeToRefs(userStore);
const { article } = storeToRefs(articleStore);

const articleId = computed(() => String(route.params.articleId || ''));
const content = ref('');
const isSubmitting = ref(false);

// Mutations
const addCommentMutation = useAddComment(articleId);
const addReplyMutation = useAddReply(articleId);

// 提交
const handleSubmit = async () => {
  // 检查文章状态
  if (article.value.status) {
    Msg.showFail('文章已被封禁,不可评论');
    return;
  }

  // 检查内容
  if (!content.value.trim()) {
    Msg.showInfo('评论内容不能为空');
    return;
  }

  isSubmitting.value = true;

  try {
    if (props.isReply && props.commentId) {
      // 回复评论
      await addReplyMutation.mutateAsync({
        commentId: props.commentId,
        content: content.value,
        replyId: props.replyId,
      });
      // 关闭回复表单
      commentStore.setActiveReply(null);
    } else {
      // 新增一级评论
      await addCommentMutation.mutateAsync(content.value);
    }
  } finally {
    isSubmitting.value = false;
  }
};

// 取消
const handleCancel = () => {
  emit('cancel');
  commentStore.setActiveReply(null);
};

// 监听清空内容事件
onMounted(() => {
  emitter.on('cleanContent', () => {
    content.value = '';
  });
});

onUnmounted(() => {
  emitter.off('cleanContent');
});
</script>

<style lang="scss" scoped>
.comment-form {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
  margin-top: 20px;
  margin-bottom: 80px;

  .input {
    // 让输入区自适应父容器，不再固定 50vw，避免被收窄时顶出边界
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
  }

  &.is-reply {
    margin: 10px 0;
    gap: 0;

    .input {
      width: 100%;
    }
  }
}
</style>
