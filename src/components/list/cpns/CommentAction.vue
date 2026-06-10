<template>
  <ListAction isComment>
    <template #comment>
      <ul class="comment-action">
        <li class="item like" role="button" @click.stop.prevent="likeClick(comment.id)">
          <Icon type="like" :isActive="isLiked(comment.id)" :label="comment.likes ? comment.likes : '点赞'" />
        </li>
        <li class="item comment" role="button" @click="wantReply(comment)">
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
import { Msg, emitter } from '@/utils';

import type { IComment } from '@/stores/types/comment.result';

const props = defineProps<{
  comment: IComment;
  isLiked: (commentId: number) => boolean;
  onLike: (commentId: number) => void;
}>();

const rootStore = useRootStore();
const userStore = useUserStore();
const { token } = storeToRefs(userStore);

const wantReply = (comment) => {
  if (token.value) {
    emitter.emit('collapse', comment); //commentId非常重要,控制编辑器的切换
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
};

const likeClick = (commentId: number) => {
  if (token.value) {
    props.onLike(commentId);
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
