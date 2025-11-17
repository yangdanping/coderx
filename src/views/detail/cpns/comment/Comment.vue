<template>
  <div class="comment">
    <template v-if="token"><CommentForm /></template>
    <template v-else>
      <div class="showLogin">
        <h1>请先登录后评论</h1>
        <el-button @click="rootStore.changeLoginDialog" type="primary">登录</el-button>
      </div>
    </template>
    <!-- -------------------------------------------------------------------- -->
    <template v-if="commentInfo.length"><CommentList :commentInfo="commentInfo" /></template>
    <template v-else-if="!noData"><el-skeleton animated /></template>
    <template v-else><h1 class="skeleton">评论区暂时为空~发表你的第一条评论吧~</h1></template>
  </div>
</template>

<script lang="ts" setup>
import CommentList from './CommentList.vue';
import CommentForm from './CommentForm.vue';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useCommentStore from '@/stores/comment.store';
const commentStore = useCommentStore();
const rootStore = useRootStore();
const userStore = useUserStore();
const { token } = storeToRefs(userStore);
const { commentInfo } = storeToRefs(commentStore);

const noData = ref(false);
onMounted(() => {
  setTimeout(() => (noData.value = !noData.value), 2000);
});
</script>

<style lang="scss" scoped>
.comment {
  width: 80%;
}
.showLogin {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
  h1 {
    padding-bottom: 20px;
  }
}

.skeleton {
  text-align: center;
}
</style>
