<template>
  <div class="comment-form" :class="{ 'is-reply': isReply }">
    <Avatar v-if="!isReply" :info="userInfo" />
    <div class="input">
      <Editor @update:content="(valueHtml) => (content = valueHtml)" isComment mode="simple" :height="isReply ? '100px' : '150px'" />
      <div class="input-action">
        <el-button v-if="isReply" @click="handleCancel" type="default" size="small">取消</el-button>
        <el-button :disabled="isSubmitting" :loading="isSubmitting" @click="handleSubmit" type="primary" :size="isReply ? 'small' : 'default'">
          {{ isSubmitting ? '提交中' : isReply ? '回复' : '发表评论' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import Editor from '@/components/wang-editor/Editor.vue';
import { Msg, emitter } from '@/utils';
import { useRoute } from 'vue-router';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import { useAddComment, useAddReply } from '@/composables/useCommentList';

const route = useRoute();
const userStore = useUserStore();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { userInfo } = storeToRefs(userStore);
const { article } = storeToRefs(articleStore);

const props = defineProps<{
  commentId?: number; // 一级评论ID（回复时使用）
  replyId?: number; // 被回复的回复ID（回复的回复时使用）
  isReply?: boolean; // 是否为回复模式
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

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

onBeforeUnmount(() => {
  emitter.off('cleanContent');
});
</script>

<style lang="scss" scoped>
.comment-form {
  display: flex;
  justify-content: center;
  margin-bottom: 80px;

  &.is-reply {
    margin-bottom: 10px;
    margin-top: 10px;
  }

  .input {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 50%;
    margin-left: 30px;

    .input-action {
      position: absolute;
      bottom: -50px;
      left: 0;
      display: flex;
      gap: 8px;
    }
  }

  &.is-reply .input {
    width: 100%;
    margin-left: 0;

    .input-action {
      position: relative;
      bottom: auto;
      margin-top: 8px;
      justify-content: flex-end;
    }
  }
}
</style>

