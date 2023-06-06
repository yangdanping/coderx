<template>
  <div class="article">
    <NavBar />
    <nav class="article-nav" v-if="tags.length">
      <ArticleNav :tags="tags" @changeTagInNav="changeTagInNav" />
    </nav>
    <div class="list-wrapper" :style="{ width: `${articleListWidth}px` }">
      <ArticleList v-if="articles.result?.length" :articles="articles" @tabClick="tabClick" />
      <div v-else-if="!noData" class="skeleton"><el-skeleton animated /></div>
      <div v-else class="skeleton">
        <h1>{{ searchStr ? `"${searchStr}"相关内容` : '该专栏' }}暂无文章,快来发表第一篇吧~</h1>
        <el-button @click="goEdit" type="primary">发表第一篇</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import ArticleList from './cpns/ArticleList.vue';
import ArticleNav from './cpns/ArticleNav.vue';
import { listWidth } from '@/global/constants/list-width';
import { emitter } from '@/utils';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const router = useRouter();
const route = useRoute();
const rootStore = useRootStore();
const userStore = useUserStore();
const articleStore = useArticleStore();
const { articles, tags } = storeToRefs(articleStore);
const { token } = storeToRefs(userStore);

const noData = ref(false);
const articleListWidth = ref(listWidth);

const searchValue = ref<any>('');
const querySearch = computed(() => route.query.searchValue);
const searchStr = computed(() => querySearch.value ?? searchValue.value); //用于请求和展示
onMounted(() => {
  console.log('当前页面是否有搜索内容', !!searchStr.value);
  articleStore.getTagsAction();
  if (!searchStr.value) {
    articleStore.getArticleListAction();
  } else {
    articleStore.getArticleListAction('', [], searchStr.value as string);
  }
  setTimeout(() => (noData.value = !noData.value), 2000);
  emitter.on('submitSearchValue', (value) => {
    searchValue.value = value;
  });
});

const changeTagInNav = () => {
  if (noData.value) {
    noData.value = false;
    setTimeout(() => (noData.value = !noData.value), 2000);
  }
  searchValue.value && (searchValue.value = '');
};

const tabClick = (order) => {
  console.log('article tabClick', order);
  if (articles.value.total! > 1) {
    if (searchStr.value) {
      console.log('对搜索结果进行排序!', searchStr.value);
      articleStore.getArticleListAction('', [], searchStr.value as string);
    } else {
      articleStore.getArticleListAction();
    }
  }
};
const goEdit = () => (token ? router.push({ path: '/edit' }) : rootStore.changeLoginDialog());
</script>

<style lang="scss" scoped>
$paddingTop: 40px;
.article {
  display: flex;
  justify-content: center;

  .article-nav {
    position: sticky;
    top: 50px;
    height: 100%;
    padding-top: $paddingTop;
  }
  .list-wrapper {
    padding-top: $paddingTop;
    .skeleton {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
  }
}
</style>
