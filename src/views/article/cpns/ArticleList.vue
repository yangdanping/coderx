<template>
  <div class="article-list">
    <template v-for="item in articles?.result" :key="item.id">
      <ArticleListItem :item="item" />
    </template>
    <Page @changePage="changePage" :total="articles?.total" />
  </div>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue';
import type { IArticles } from '@/stores/types/article.result';
import ArticleListItem from './ArticleListItem.vue';
import useArticleStore from '@/stores/article';
import Page from '@/components/Page.vue';

const articleStore = useArticleStore();
defineProps({
  articles: {
    type: Object as PropType<IArticles>,
    default: () => {}
  }
});
const changePage = () => articleStore.getListAction();
</script>

<style lang="scss" scoped>
.article-list {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
  border-radius: 10px;
  animation: moveDown 1s forwards;
}
</style>