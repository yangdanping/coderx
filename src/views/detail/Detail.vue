<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor(userInfo.id)" /></template>
    </NavBar>
    <DetailContent :article="article" />
    <!-- 评论系统：可通过 COMMENT_VERSION 切换版本 -->
    <!-- V1: 旧版评论组件 -->
    <!-- <CommentOld :commentInfo="commentInfo" /> -->
    <!-- V2: 新版评论组件（使用 TanStack Query 实现分页加载） -->
    <Comment />
    <AiAssistant :context="article?.content" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import DetailContent from './cpns/detail/DetailContent.vue';
// V1: 旧版评论组件
// import CommentOld from './cpns/comment_old/CommentOld.vue';
// V2: 新版评论组件
import Comment from './cpns/comment/Comment.vue';
import AiAssistant from '@/components/AiAssistant.vue';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
// V1: 旧版评论 store
// import useCommentStore from '@/stores/comment.store';
import useHistoryStore from '@/stores/history.store';

const route = useRoute();
const articleStore = useArticleStore();
// V1: 旧版评论 store
// const commentStore = useCommentStore();
const { article, isAuthor } = storeToRefs(articleStore);
// V1: 旧版评论数据
// const { commentInfo } = storeToRefs(commentStore);
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
