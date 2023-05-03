<template>
  <div class="article">
    <NavBar />
    <nav class="article-nav">
      <ArticleNav />
    </nav>
    <div class="list-wrapper">
      <ArticleList v-if="articles.result?.length" :articles="articles" />
      <div v-else-if="!noList" class="skeleton"><el-skeleton animated /></div>
      <div v-else class="skeleton">
        <h1>该专栏暂无文章,快来发表第一篇吧~</h1>
        <el-button @click="goEdit" type="primary">发表第一篇</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import ArticleList from './cpns/ArticleList.vue';
import ArticleNav from './cpns/ArticleNav.vue';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const router = useRouter();
const rootStore = useRootStore();
const userStore = useUserStore();
const articleStore = useArticleStore();
const { articles } = storeToRefs(articleStore);
const { token } = storeToRefs(userStore);

const noList = ref(false);

onMounted(() => {
  articleStore.getListAction();
  setTimeout(() => (noList.value = !noList.value), 2000);
});

const goEdit = () => (token ? router.push({ path: '/edit' }) : rootStore.changeLoginDialog());
</script>

<style lang="scss" scoped>
$paddingTop: 60px;
.article {
  display: flex;
  justify-content: center;

  .article-nav {
    position: sticky;
    top: 30px;
    height: 100%;
    padding-top: $paddingTop;
  }
  .list-wrapper {
    padding-top: $paddingTop;
    margin: 0 60px;
    .skeleton {
      width: 50%;
    }
  }
}
</style>
