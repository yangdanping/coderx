<template>
  <ActionList :isComment="true">
    <template #comment>
      <ul class="comment-action">
        <li @click="likeComment(comment.id)" class="item like" :class="isCommentUserLiked(comment.id)">
          <i></i><span>{{ comment.likes ?? '点赞' }}</span>
        </li>
        <li @click="wantReply(comment)" class="item comment">
          <i></i><span>{{ '回复' }}</span>
        </li>
      </ul>
    </template>
  </ActionList>
</template>

<script lang="ts" setup>
import ActionList from '@/components/ActionList.vue';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import useCommentStore from '@/stores/comment';
import { Msg, emitter } from '@/utils';
const commentStore = useCommentStore();
const rootStore = useRootStore();
const articleStore = useArticleStore();
const userStore = useUserStore();
const { token } = storeToRefs(userStore);
const { article } = storeToRefs(articleStore);
const { isCommentUserLiked } = storeToRefs(commentStore);

import type { IComment } from '@/stores/types/comment.result';

const props = defineProps({
  comment: {
    type: Object as PropType<IComment>,
    default: () => {}
  }
});

const wantReply = (comment) => {
  if (token.value) {
    emitter.emit('collapse', comment); //commentId非常重要,控制编辑器的切换
  } else {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  }
};

const likeComment = (commentId) => {
  if (token.value) {
    commentStore.likeAction({ commentId, articleId: article.value.id });
  } else {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
