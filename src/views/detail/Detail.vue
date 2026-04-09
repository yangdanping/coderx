<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor(userInfo.id)" /></template>
    </NavBar>
    <DetailContent :article="article" />
    <Comment />
    <AiAssistant :context="article?.content" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import DetailContent from './cpns/detail/DetailContent.vue';
import Comment from './cpns/comment/Comment.vue';
import AiAssistant from '@/components/AiAssistant.vue';
import useArticleStore from '@/stores/article.store';
import useUserStore from '@/stores/user.store';

const route = useRoute();
const articleStore = useArticleStore();
const userStore = useUserStore();
const { userInfo } = storeToRefs(userStore);
const { article, isAuthor } = storeToRefs(articleStore);
const articleId = computed(() => route.params.articleId as string | undefined);

watch(
  articleId,
  (newArticleId) => {
    if (!newArticleId) return;
    articleStore.getDetailAction(newArticleId);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
