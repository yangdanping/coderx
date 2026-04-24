<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor" /></template>
    </NavBar>

    <!--
      ┌─────────────┬────────────────────┬─────────────┐
      │ panel (col1)│ content (col2)     │ toc (col3)  │
      │  sticky     │  DetailContent +   │  sticky     │
      │  20vh       │  Comment           │  80px       │
      └─────────────┴────────────────────┴─────────────┘
      左右两个 1fr 列共同保证中间正文列在视口居中。
      DetailPanel / DetailToc 不再需要 position: fixed，
      也就不再需要 DetailContent/Comment 自己算"让位空间"。
    -->
    <div class="detail-main">
      <DetailPanel v-if="isDetailReady" class="detail-main__panel" :article="article" />

      <div class="detail-main__content">
        <DetailContent :article="article" :status="detailStatus" @update:toc="tocTitles = $event" />
        <Comment />
      </div>

      <DetailToc v-if="isDetailReady && tocTitles.length" :titles="tocTitles" class="detail-main__toc" />
    </div>

    <AiAssistant v-if="isDetailReady" :context="detailAiContext" />
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import DetailContent from './cpns/detail/DetailContent.vue';
import DetailPanel from './cpns/detail/DetailPanel.vue';
import DetailToc from './cpns/detail/DetailToc.vue';
import Comment from './cpns/comment/Comment.vue';
import AiAssistant from '@/components/ai/AiAssistant.vue';
import { resolveArticleDetailHtml } from '@/service/article/article.content';
import { useArticleDetail } from '@/composables/useArticleDetail';
import useUserStore from '@/stores/user.store';

import type { DetailTocTitle } from './cpns/detail/types/detail-toc.type';

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
const detailAiContext = computed(() => resolveArticleDetailHtml(article.value));

// TOC 标题由 DetailContent 从已渲染 HTML 中提取后上抛。
// 放在 Detail.vue 是因为 DetailToc 组件需要作为外层 grid 的第 3 列直接参与布局，
// 不再作为 DetailContent 的内部子元素。
const tocTitles = ref<DetailTocTitle[]>([]);
</script>

<style lang="scss" scoped>
@use '@/assets/css/detail-layout' as *;

.detail {
  display: flex;
  flex-direction: column;
  align-items: center;

  // 正文可读列宽度的单一真相源: 在根节点以 CSS 变量下发给所有子组件。
  // 媒体查询只在此处改写一次, 避免每个子组件各自重复媒体查询.
  --detail-readable-max: #{$detail-readable-max};

  @media (max-width: $detail-breakpoint-tablet) {
    --detail-readable-max: #{$detail-readable-narrow-max};
  }
}

.detail-main {
  width: 100%;
  margin-top: 80px;
  display: grid;
  grid-template-columns:
    minmax($detail-panel-col-min, 1fr)
    minmax(0, var(--detail-readable-max))
    minmax($detail-panel-col-min, 1fr);
  column-gap: $detail-layout-gap;
  align-items: start;

  &__panel {
    grid-column: 1;
    // 贴近视口左边缘, 近似保留原本 `left: 2vw` 的位置感
    justify-self: start;
    align-self: start;
    margin-left: 2vw;
  }

  &__content {
    grid-column: 2;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__toc {
    grid-column: 3;
    justify-self: start;
    align-self: start;
    width: $detail-toc-col-width;
    max-width: 100%;
    position: sticky;
    top: 80px;
  }
}
</style>
