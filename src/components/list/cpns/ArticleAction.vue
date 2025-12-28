<template>
  <ListAction>
    <template #article>
      <ul class="article-action">
        <li class="item view">
          <Icon type="views" :label="article.views" />
        </li>
        <li class="item like" @click.stop.prevent="article.id && likeClick(article.id)">
          <Icon type="like" :isActive="article.id ? isLiked(article.id) : false" :label="article.likes" />
        </li>
        <li class="item comment">
          <Icon type="comment" :label="article.commentCount" />
        </li>
      </ul>
    </template>
  </ListAction>
</template>

<script lang="ts" setup>
import ListAction from './ListAction.vue';
import Icon from '@/components/icon/Icon.vue';
import { Msg } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';

const rootStore = useRootStore();
const userStore = useUserStore();

const { token } = storeToRefs(userStore);

const {
  article = {},
  isLiked,
  onLike,
} = defineProps<{
  article: IArticle;
  isLiked: (articleId: number) => boolean;
  onLike;
}>();

const likeClick = (articleId) => {
  if (token.value) {
    if (article.status) {
      Msg.showFail('文章已被封禁,不可点赞');
    } else {
      onLike(articleId);
    }
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
