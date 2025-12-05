<template>
  <ListAction isComment>
    <template #comment>
      <ul class="comment-action">
        <li class="item like" @click.stop.prevent="likeComment(comment)">
          <Icon type="like" :isActive="isCommentUserLiked(comment.id)" :label="comment.likes ? comment.likes : '点赞'" />
        </li>
        <li class="item comment" @click="wantReply(comment)">
          <Icon type="comment" label="回复" />
        </li>
      </ul>
    </template>
  </ListAction>
</template>

<script lang="ts" setup>
import ListAction from './ListAction.vue';
import Icon from '@/components/icon/Icon.vue';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import { Msg, emitter } from '@/utils';
const commentStore = useCommentStore();
const rootStore = useRootStore();
const articleStore = useArticleStore();
const userStore = useUserStore();
const { token } = storeToRefs(userStore);
const { article } = storeToRefs(articleStore);
const { isCommentUserLiked } = storeToRefs(commentStore);

import type { ICommentOld } from '@/stores/types/comment.result';

const { inArticle = true, comment } = defineProps<{
  inArticle?: boolean;
  comment: ICommentOld;
}>();

const wantReply = (comment) => {
  if (token.value) {
    emitter.emit('collapse', comment); //commentId非常重要,控制编辑器的切换
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
};

const likeComment = (comment) => {
  if (token.value) {
    // commentStore.likeAction({ commentId, articleId: article.value.id });
    commentStore.likeAction(comment, inArticle);
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
