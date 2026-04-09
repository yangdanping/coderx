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
              <ArticleAction :article="item" :isLiked="isLiked" :onLike="likeArticle" />
            </template>
          </ListItem>
        </template>
        <Page v-model:currentPage="pageNum" v-model:pageSize="pageSize" @changePage="changePage" :total="profile.articleCount" />
      </template>
      <template v-else><span>这个人未发表过文章</span></template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Page from '@/components/Page.vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import { useUserLikedArticles, useLikeArticle } from '@/composables/useArticleList';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
const userStore = useUserStore();
const articleStore = useArticleStore();
const { profile } = storeToRefs(userStore);
const { articles } = storeToRefs(articleStore);

const pageNum = ref(1);
const pageSize = ref(10);

// 用户点赞状态
const { isLiked } = useUserLikedArticles();

// 点赞操作
const { mutate: likeArticle } = useLikeArticle();

watch(
  () => profile.value.id,
  (newV) => {
    pageNum.value = 1;
    articleStore.refreshFirstPageAction({ userId: newV, pageSize: pageSize.value });
  },
);
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));

const changePage = () => articleStore.getArticleListAction({ userId: profile.value.id, pageNum: pageNum.value, pageSize: pageSize.value });
</script>

<style lang="scss" scoped>
.user-article {
  .list-header {
    @include thin-border(bottom, #eee);
    padding-bottom: 10px;
    padding-left: 10px;
  }
  .list {
    padding: 0 20px;
  }
}
</style>
