<template>
  <div class="user-article">
    <div class="list-header">
      <h2>{{ sex }}的文章({{ profile.articleCount }})</h2>
    </div>
    <div class="list">
      <template v-if="articles.result?.length">
        <template v-for="item in articles.result" :key="item.id">
          <ListItem :item="item">
            <template #action>
              <ArticleAction :article="item" />
            </template>
          </ListItem>
        </template>
        <Page @changePage="changePage" :total="profile.articleCount" />
      </template>
      <template v-else><span>这个人未发表过文章</span></template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Page from '@/components/Page.vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
const userStore = useUserStore();
const articleStore = useArticleStore();
const { profile } = storeToRefs(userStore);
const { articles } = storeToRefs(articleStore);

watch(
  () => profile.value.id,
  (newV) => {
    articleStore.refreshFirstPageAction({ userId: newV }); //初始化时获取该用户发表过的文章
  },
);
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));

// const changePage = () => userStore.getArticleListAction(profile.value.id);
const changePage = () => articleStore.getArticleListAction({ userId: profile.value.id });
</script>

<style lang="scss" scoped>
.user-article {
  .list-header {
    border-bottom: 1px solid #ccc;
    padding-bottom: 10px;
  }
  .list {
    padding: 0 20px;
  }
}
</style>
