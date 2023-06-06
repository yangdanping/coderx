<template>
  <div class="article-list">
    <h3 class="result" v-if="searchValue">
      <el-icon class="back" @click="goBack"><IBack /></el-icon>
      搜索:"{{ searchValue }}"
    </h3>
    <template v-if="!noSearchData">
      <div class="list-order">
        <div @click="setOrder('date')" :class="{ active: pageOrder === 'date' }">最新</div>
        <div @click="setOrder('hot')" :class="{ active: pageOrder === 'hot' }">热门</div>
      </div>
      <template v-for="item in articles?.result" :key="item.id">
        <ListItem :item="item">
          <template #action>
            <ArticleAction :article="item" />
          </template>
        </ListItem>
      </template>
      <Page @changePage="changePage" :total="articles?.total" />
    </template>
    <template v-else>
      <h2 class="msg">coderX还没有"{{ searchValue }}"的相关内容</h2>
    </template>
  </div>
</template>

<script lang="ts" setup>
import Page from '@/components/Page.vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import useRootStore from '@/stores';
import useArticleStore from '@/stores/article';
import { emitter } from '@/utils';

import type { IArticles } from '@/stores/types/article.result';

const articleStore = useArticleStore();
const rootStore = useRootStore();
const { pageOrder } = storeToRefs(rootStore);

const searchValue = ref('');
const noSearchData = ref(false);
const props = defineProps({
  articles: {
    type: Object as PropType<IArticles>,
    default: () => {}
  }
});
onMounted(() => {
  emitter.on('submitSearchValue', (value) => {
    searchValue.value = value as string;
  });
  emitter.on('changeTagInNav', () => {
    searchValue.value && (searchValue.value = '');
  });
});

watch(
  () => props.articles,
  (newV) => {
    if (searchValue.value) {
      if (newV.result?.length) {
        noSearchData.value = false;
        console.log(searchValue.value, '有搜索结果');
      } else {
        noSearchData.value = true;
        console.log(searchValue.value, '无搜索结果');
      }
    }
  }
);

const goBack = () => {
  noSearchData.value = false;
  searchValue.value = '';
  articleStore.getArticleListAction();
};
const emit = defineEmits(['tabClick']);
const setOrder = (order: string) => {
  noSearchData.value && (noSearchData.value = false);
  rootStore.changePageNum(1);
  rootStore.changePageOrder(order);
  emit('tabClick', order);
  window.scrollTo(0, 0);
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
  .msg {
    margin-top: 100px;
  }
  .result {
    position: absolute;
    top: 0;
    left: 50px;
    display: flex;
    align-items: center;
    z-index: 99;
    color: #5f5f5f;
    .back {
      font-size: 25px;
      margin-right: 8px;
      cursor: pointer;
    }
  }
  .list-order {
    position: sticky;
    top: 80px;
    display: flex;
    justify-content: right;
    width: 100%;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    > div {
      display: flex;
      background-color: rgba(255, 255, 255, 0.5);

      align-items: center;
      justify-content: center;
      border-radius: 10px;
      height: 30px;
      width: 60px;
      margin-left: 10px;
      cursor: pointer;
      &.active {
        background: #409eff;
        color: #fff;
      }
    }
  }
}
</style>
