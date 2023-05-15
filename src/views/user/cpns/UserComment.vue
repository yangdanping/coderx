<template>
  <div class="user-comment">
    <div class="list-header">
      <h2>{{ sex }}的评论({{ profile.commentCount }})</h2>
    </div>
    <div class="list">
      <template v-if="comments.length">
        <template v-for="item in (comments as any[])" :key="item.id">
          <ListItem :item="item" isComment>
            <template #action>
              <CommentAction :comment="item" />
            </template>
          </ListItem>
        </template>
        <Page @changePage="changePage" :total="profile.commentCount" />
      </template>
      <template v-else><span>这个人未发表过评论</span></template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ListItem from '@/components/list/ListItem.vue';
import CommentAction from '@/components/list/cpns/CommentAction.vue';
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

  .list {
    padding: 0 20px;
  }
}
</style>
