<template>
  <div class="article">
    <nav class="article-nav" v-if="tags.length">
      <ArticleNav :tags="tags" />
    </nav>
    <div class="list-wrapper">
      <ArticleList />
    </div>
    <div class="article-recommends">
      <ArticleRecommend v-show="toggleRec" :recommends="recommends" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ArticleList from './cpns/ArticleList.vue';
import ArticleRecommend from './cpns/ArticleRecommend.vue';
import ArticleNav from './cpns/ArticleNav.vue';
import useRootStore from '@/stores/index.store';
import useArticleStore from '@/stores/article.store';
const rootStore = useRootStore();
const articleStore = useArticleStore();
const { recommends, tags } = storeToRefs(articleStore);
const { isSmallScreen } = storeToRefs(rootStore);

// toggle左侧推荐文章可见性
const toggleRec = computed(() => !isSmallScreen.value);

onMounted(() => {
  articleStore.getTagsAction();
  articleStore.getRecommendAction();
});
</script>

<style lang="scss" scoped>
$paddingTop: 60px;
.article {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 0 auto;

  .article-nav,
  .article-recommends {
    position: sticky;
    top: calc($paddingTop * 2);
    height: 100%;
  }

  .list-wrapper {
    padding-top: 20px;
  }

  /**
   * 响应式布局总结：
   * 1. 大中型屏幕 (max-width: 1200px):
   *    - 页面布局从水平 (flex-row) 切换为垂直 (flex-column) 排布。
   *    - 导航栏 (article-nav) 取消粘滞定位 (sticky)，改为占满宽度且居中对齐。
   *    - 内容列表区域 (list-wrapper) 占满 100% 宽度，不再受限。
   *    - 注意：侧边推荐位 (article-recommends) 通过 computed 逻辑在小屏下被完全隐藏。
   * 2. 小型屏幕/移动端 (max-width: 768px):
   *    - 列表容器增加左右内边距 (10px)，防止文字紧贴屏幕边缘。
   */

  // 中屏适配 (平板或窄屏桌面)
  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
    justify-content: flex-start; // 确保内容从顶部开始排列，防止标签"掉下来"
    gap: 0;

    .article-nav {
      position: sticky;
      top: var(--navbarHeight);
      z-index: var(--z-sticky);
      width: 100%;
      padding-top: 0;
      flex-shrink: 0;
    }

    .list-wrapper {
      width: 100%;
      max-width: 100%;
    }
  }

  // 小屏/移动端适配
  @media (max-width: 768px) {
    .list-wrapper {
      padding-left: 10px;
      padding-right: 10px;
    }
  }
}
</style>
