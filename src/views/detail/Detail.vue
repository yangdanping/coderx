<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor(userInfo.id)" /></template>
    </NavBar>
    <DetailContent :article="article" />
    <Comment :commentInfo="commentInfo" />
    <AiAssistant :context="article?.content" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import DetailContent from './cpns/detail/DetailContent.vue';
import Comment from './cpns/comment/Comment.vue';
import AiAssistant from '@/components/AiAssistant.vue';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import useHistoryStore from '@/stores/history.store';

const route = useRoute();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { article, isAuthor } = storeToRefs(articleStore);
const { commentInfo } = storeToRefs(commentStore);
const { userInfo } = storeToRefs(useUserStore());
const historyStore = useHistoryStore();
const userStore = useUserStore();
const { token } = storeToRefs(userStore);

onMounted(() => {
  console.log('onMounted articleStore.getDetailAction', route.params.articleId);
  articleStore.getDetailAction(route.params.articleId);
  token.value && historyStore.addHistoryAction(route.params.articleId);
});
</script>

<style lang="scss" scoped>
.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
