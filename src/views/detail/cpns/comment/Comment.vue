<template>
  <div class="comment">
    <!-- 评论表单 -->
    <template v-if="token">
      <CommentForm />
    </template>
    <template v-else>
      <div class="showLogin">
        <h1>请先登录后评论</h1>
        <el-button @click="rootStore.toggleLoginDialog" type="primary" plain>登录</el-button>
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
@use '@/assets/css/detail-layout' as *;

// 评论区的宽度与正文列完全对齐, 直接复用 mixin:
//   1. 消费 .detail 根节点下发的 `--detail-readable-max` 作为 max-width
//   2. 通过外层 grid 的左右两个 1fr 列天然避开 DetailPanel, 不需要再手算 safe-width
//   3. 媒体查询已在 mixin / 根节点内处理, 这里不再重复
.comment {
  @include detail-centered-column;
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
