<template>
  <div class="article">
    <NavBar />
    <div class="list-wrapper">
      <nav class="article-nav">
        <ArticleNav />
      </nav>
      <ArticleList v-if="articles.result?.length" :articles="articles" />
      <div v-else-if="!noList" class="skeleton">
        <el-skeleton animated />
      </div>
      <div v-else class="skeleton">
        <h1>该专栏暂无文章,快来发表第一篇吧~</h1>
        <el-button @click="goEdit" type="primary">发表第一篇</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import NavBar from '@/components/navbar/NavBar.vue';
import ArticleList from './cpns/ArticleList.vue';
import ArticleNav from './cpns/ArticleNav.vue';
import useArticleStore from '@/stores/article';
import useUserStore from '@/stores/user';
import useRootStore from '@/stores';

const articleStore = useArticleStore();
const userStore = useUserStore();
const rootStore = useRootStore();
const router = useRouter();
const { articles } = storeToRefs(articleStore);
// const articles = ref([]);
const { token } = storeToRefs(userStore);
const noList = ref(false);

onMounted(() => {
  articleStore.getListAction();
  setTimeout(() => (noList.value = !noList.value), 2000);
});

const goEdit = () => (token ? router.push({ path: '/edit' }) : rootStore.changeLoginDialog());
</script>

<style lang="scss" scoped>
.article {
  .list-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 60px;
    .article-nav {
      position: fixed;
      left: 8vw;
      top: 150px;
    }
    .skeleton {
      width: 50%;
    }
  }
}
</style>
