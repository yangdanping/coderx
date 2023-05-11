<template>
  <div class="user-comment">
    <div class="list-header">
      <h2>{{ sex }}的评论({{ profile.commentCount }})</h2>
    </div>
    <template v-if="comments.length">
      <template v-for="item in (comments as any[])" :key="item.id">
        <div class="content-wrapper">
          <div class="content-main">
            <div class="content" @click="goDetail(item.id)">
              <a class="title">{{ item.title }}</a>
              <div>
                <span>{{ item.createAt }}</span>
                <p class="abstract">{{ item.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
      <Page @changePage="changePage" :total="profile.commentCount" />
    </template>
    <template v-else><span>这个人未发表过评论</span></template>
  </div>
</template>

<script lang="ts" setup>
import useUserStore from '@/stores/user';
const router = useRouter();
const userStore = useUserStore();
const { profile, comments } = storeToRefs(userStore);

const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
const changePage = () => userStore.getCommentAction(profile.value.id);

const goDetail = (articleId) => router.push({ path: `/article/${articleId}` });
</script>

<style lang="scss" scoped>
.user-comment {
  .list-header {
    border-bottom: 1px solid #ccc;
    padding-bottom: 10px;
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
