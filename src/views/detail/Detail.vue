<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor" /></template>
    </NavBar>
    <DetailContent :article="article" :status="detailStatus" />
    <Comment />
    <AiAssistant v-if="isDetailReady" :context="article?.content" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import DetailContent from './cpns/detail/DetailContent.vue';
import Comment from './cpns/comment/Comment.vue';
import AiAssistant from '@/components/AiAssistant.vue';
import { useArticleDetail } from '@/composables/useArticleDetail';
import useUserStore from '@/stores/user.store';

const route = useRoute();
const userStore = useUserStore();
const { userInfo } = storeToRefs(userStore);
const articleId = computed(() => route.params.articleId as string | undefined);
const detailQuery = useArticleDetail(articleId);

/*
 * ======== 详情页状态收口 ========
 * 1. 页面直接消费 useArticleDetail 暴露的查询状态，不再手写 watch + detailStatus。
 * 2. 顶部工具栏、正文和 AI 助手都围绕同一份 query 状态做显示判断，边界更稳定。
 */
const article = computed(() => detailQuery.article.value);
const detailStatus = computed(() => detailQuery.status.value);
const isDetailReady = computed(() => detailQuery.isDetailReady.value);
const isAuthor = computed(() => article.value.author?.id === userInfo.value.id);
</script>

<style lang="scss" scoped>
.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
