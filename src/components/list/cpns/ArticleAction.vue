<template>
  <ListAction>
    <template #article>
      <ul class="article-action">
        <li class="item view">
          <Icon type="views" :label="article.views" />
        </li>
        <li class="item like" @click.stop.prevent="likeClick(article.id)">
          <Icon type="like" :isActive="isArticleUserLiked(article.id)" :label="article.likes" />
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

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const router = useRouter();
const rootStore = useRootStore();
const userStore = useUserStore();
const articleStore = useArticleStore();

const { token } = storeToRefs(userStore);
const { isArticleUserLiked } = storeToRefs(articleStore);

const props = defineProps({
  article: {
    type: Object as PropType<IArticle>,
    default: () => {},
  },
});

const likeClick = (articleId) => {
  if (token.value) {
    if (props.article.status) {
      Msg.showFail('文章已被封禁,不可点赞');
    } else {
      articleStore.likeAction(articleId);
    }
  } else {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  }
};
</script>

<style lang="scss" scoped></style>
