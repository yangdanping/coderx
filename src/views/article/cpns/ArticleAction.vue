<template>
  <ActionList>
    <template #article>
      <ul class="article-action">
        <li class="item view" @click="goDetail(article.id)">
          <Icon type="views" :label="article.views" />
        </li>
        <li class="item like" @click="likeClick(article.id)">
          <Icon type="like" :isActive="isArticleUserLiked(article.id)" :label="article.likes" />
        </li>
        <li class="item comment" @click="goDetail(article.id)">
          <Icon type="comment" :label="article.commentCount" />
        </li>
      </ul>
    </template>
  </ActionList>
</template>

<script lang="ts" setup>
import ActionList from '@/components/ActionList.vue';
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
    default: () => {}
  }
});

const likeClick = (articleId) => {
  if (token) {
    if (props.article.status === '1') {
      Msg.showFail('文章已被封禁,不可点赞');
    } else {
      articleStore.likeAction(articleId);
    }
  } else {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  }
};
const goDetail = (articleId) => router.push({ path: `/article/${articleId}` });
</script>

<style lang="scss" scoped></style>
