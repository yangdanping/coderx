<template>
  <div class="article-list">
    <div class="list-header">
      <h2>{{ sex }}的文章({{ profile.articleCount }})</h2>
    </div>
    <template v-if="articles.length">
      <template v-for="item in articles" :key="item.id">
        <div class="content-wrapper">
          <div class="content-main">
            <div class="content" @click="goDetail(item?.id)">
              <a class="title">{{ item?.title }}</a>
              <div>
                <span>{{ item?.createAt }}</span>
                <p class="abstract">{{ item?.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
      <Page @changePage="changePage" :total="profile.articleCount" />
    </template>
    <template v-else><span>这个人未发表过文章</span></template>
  </div>
</template>

<script lang="ts" setup>
import Page from '@/components/Page.vue';

import useUserStore from '@/stores/user';
const router = useRouter();
const userStore = useUserStore();
const { profile, articles } = storeToRefs(userStore);

const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));

const changePage = () => userStore.getArticleAction(profile.value.id);

const goDetail = (articleId) => router.push({ path: `/article/${articleId}` });
</script>

<style lang="scss" scoped>
.article-list {
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  .list-header {
    border-bottom: 1px solid #ccc;
  }
  .content-wrapper {
    display: flex;
    border-bottom: 1px solid #e5e6eb;
    padding-bottom: 15px;

    .content-main {
      margin: 20px 0 20px 20px;
      .content {
        cursor: pointer;
      }
      .title {
        font-weight: 700;
        font-size: 24px;
      }
      .abstract {
        height: 20px;
        width: 800px;
        padding: 15px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
