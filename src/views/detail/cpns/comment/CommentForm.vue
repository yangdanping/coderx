<template>
  <div class="comment-form">
    <Avatar :info="userInfo" />
    <div class="input">
      <Editor @update:content="upDateContent" :isComment="true" height="100%" />
      <div class="input-action">
        <el-button :disabled="disabled" @click="addComment" type="primary">{{ disabled ? '提交中' : '发表评论' }}</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import Editor from '@/components/wang-editor/Editor.vue';
import { Msg } from '@/utils';

import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import useCommentStore from '@/stores/comment';
const articleStore = useArticleStore();
const userStore = useUserStore();
const commentStore = useCommentStore();
const { userInfo } = storeToRefs(userStore);
const { article } = storeToRefs(articleStore);

const props = defineProps({
  commentId: {
    type: Number
  },
  isReply: {
    type: Boolean
  },
  replyId: {
    type: Number
  }
});

const content = ref('');
const disabled = ref(false);

const upDateContent = (valueHtml: string) => {
  content.value = valueHtml;
};

const addComment = () => {
  if (article.value.status === '1') {
    Msg.showFail('文章已被封禁,不可评论');
  } else {
    if (!content.value) {
      Msg.showInfo('评论内容不能为空');
    } else {
      disabled.value = !disabled.value;
      setTimeout(() => {
        // 这里的isReplyComment用作判断是否是对回复用户的回复,真正传入数据库的是当前真实回复的用户
        commentStore.commentAction({
          content: content.value,
          articleId: article.value.id,
          isReplyToComment: props.isReply ?? false,
          commentId: props.commentId ?? null,
          replyId: props.replyId ?? null
        });
        disabled.value = !disabled.value;
      }, 500);
    }
  }
};
</script>

<style lang="scss" scoped>
.comment-form {
  display: flex;
  justify-content: center;
  margin-bottom: 80px;
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
    }
  }
}
</style>
