<template>
  <div class="article-list">
    <div class="list-order">
      <div @click="setOrder('date')" :class="{ active: activeOrder === 'date' }">最新</div>
      <div @click="setOrder('hot')" :class="{ active: activeOrder === 'hot' }">热门</div>
    </div>
    <template v-for="item in articles?.result" :key="item.id">
      <ListItem :item="item">
        <template #action>
          <ArticleAction :article="item" />
        </template>
      </ListItem>
    </template>
    <Page @changePage="changePage" :total="articles?.total" />
  </div>
</template>

<script lang="ts" setup>
import Page from '@/components/Page.vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import useArticleStore from '@/stores/article';

import type { IArticles } from '@/stores/types/article.result';

const articleStore = useArticleStore();
defineProps({
  articles: {
    type: Object as PropType<IArticles>,
    default: () => {}
  }
});
const activeOrder = ref('date');
const emit = defineEmits(['tabClick']);
const setOrder = (order) => {
  activeOrder.value = order;
  emit('tabClick', order);
};
const changePage = () => articleStore.getArticleListAction();
</script>

<style lang="scss" scoped>
.article-list {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  backdrop-filter: blur(10px);
  border-radius: 10px;
  animation: moveDown 1s forwards;
  .list-order {
    position: absolute;
    top: -35px;
    right: 30px;
    display: flex;
    > div {
      display: flex;
      background: #f1f1f1;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      height: 30px;
      width: 60px;
      margin-right: 10px;
      cursor: pointer;
      &.active {
        background: #409eff;
        color: #fff;
      }
    }
  }
}
</style>
