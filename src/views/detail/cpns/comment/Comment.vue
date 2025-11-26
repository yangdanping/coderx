<template>
  <div class="comment">
    <!-- 评论表单 -->
    <template v-if="token">
      <CommentForm />
    </template>
    <template v-else>
      <div class="showLogin">
        <h1>请先登录后评论</h1>
        <el-button @click="rootStore.changeLoginDialog" type="primary">登录</el-button>
      </div>
    </template>

    <!-- 评论列表 -->
    <CommentList />
  </div>
</template>

<script lang="ts" setup>
import CommentForm from './CommentForm.vue';
import CommentList from './CommentList.vue';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';

const rootStore = useRootStore();
const userStore = useUserStore();
const { token } = storeToRefs(userStore);
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
</style>





