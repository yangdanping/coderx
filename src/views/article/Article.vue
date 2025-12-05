<template>
  <div class="article">
    <NavBar />
    <nav class="article-nav" v-if="tags.length">
      <ArticleNav :tags="tags" @changeTagInNav="changeTagInNav" />
    </nav>
    <div class="list-wrapper" :style="{ width: `${articleListWidth}px` }">
      <!-- 新架构：直接渲染 ArticleList，不再依赖 Store 数据控制显示 -->
      <ArticleList @tabClick="tabClick" />
    </div>
    <div class="article-recommends">
      <ArticleRecommend v-if="showRecommend" :recommends="recommends" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import ArticleList from './cpns/ArticleList.vue';
import ArticleRecommend from './cpns/ArticleRecommend.vue';
import ArticleNav from './cpns/ArticleNav.vue';
import { listWidth } from '@/global/constants/list-width';
import { emitter } from '@/utils';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
const router = useRouter();
const route = useRoute();
const rootStore = useRootStore();
const userStore = useUserStore();
const articleStore = useArticleStore();
const { articles, recommends, tags } = storeToRefs(articleStore);
const { token } = storeToRefs(userStore);
const { windowInfo } = storeToRefs(rootStore);

const noData = ref(false);
const articleListWidth = ref(listWidth);
const showRecommend = ref(true);
watch(
  () => windowInfo.value,
  (newV) => (showRecommend.value = newV.width < 1100 ? false : true),
);

const searchValue = ref<any>('');
const querySearch = computed(() => route.query.searchValue);
const searchStr = computed(() => querySearch.value ?? searchValue.value); //用于请求和展示
onMounted(() => {
  console.log('当前页面是否有搜索内容', !!searchStr.value);
  articleStore.getTagsAction();
  articleStore.getRecommendAction();
  // 移除旧的 Store 请求逻辑，交由 ArticleList (最新版TanStack Query) 内部自动管理
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
  // 排序逻辑现已由 ArticleList(最新版) 内部的 pageOrder 响应式参数自动触发更新
  // 这里仅保留日志，或者处理其他非列表相关的副作用
};
const goEdit = () => (token ? router.push({ path: '/edit' }) : rootStore.toggleLoginDialog());
</script>

<style lang="scss" scoped>
$paddingTop: 60px;
.article {
  display: flex;
  justify-content: center;
  padding: 0 350px;
  .article-nav,
  .article-recommends {
    position: sticky;
    top: calc($paddingTop * 2);
    padding-top: $paddingTop;
    height: 100%;
  }
  .list-wrapper {
    padding-top: 20px;
    flex: 1;
    margin: 0 60px;

    .skeleton {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 814px;
    }
  }
}
</style>
