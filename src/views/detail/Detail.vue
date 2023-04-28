<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor(userInfo.id)" /></template>
    </NavBar>
    <DetailContent :article="article" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import DetailContent from './cpns/detail/DetailContent.vue';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import type { IArticle } from '@/stores/types/article.result';
import { useRoute } from 'vue-router';
const articleStore = useArticleStore();
const { article, isAuthor } = storeToRefs(articleStore);
const { userInfo } = storeToRefs(useUserStore());
const route = useRoute();
defineProps({
  article: {
    type: Object as PropType<IArticle>,
    default: () => {}
  }
});
onMounted(() => {
  console.log('onMounted articleStore.getDetailAction', route.params.articleId);
  articleStore.getDetailAction(route.params.articleId);
});
</script>

<style lang="scss" scoped>
.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
