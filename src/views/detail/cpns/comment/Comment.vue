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
// 与 DetailContent 中 $main-column-max-width 保持一致，
// 让评论区的最大宽度严格对齐文章正文列，避免出现评论明显比正文更宽的情况。
$layout-gap: 20px;
$side-column-width: 220px;
$detail-content-padding: 24px;

// 左侧 DetailPanel 是 position: fixed; left: 2vw，图标栏宽度 ~70px。
// 为了评论区在任何视口宽度下都不会盖到这个固定侧栏，
// 两边对称保留一个"安全内缩" = 2vw + 70px 图标栏 + 12px 视觉间隔。
// 这个值同时会作为下面 media query 之外的一条硬性上限，
// 避免跨 992 断点时一下子从"窄"切换到"90%"导致宽度跳变。
$fixed-side-safe-inset: calc(2vw + 82px);
$fixed-side-safe-width: calc(100vw - #{$fixed-side-safe-inset} * 2);

$main-column-max-width: min(
  1100px,
  60vw,
  calc(100vw - (#{$side-column-width} * 2) - (#{$layout-gap} * 2) - (#{$detail-content-padding} * 2))
);

.comment {
  width: 100%;
  // 同时受"文章正文主列"和"左侧固定栏安全区"两条上限约束，取更小者。
  max-width: min($main-column-max-width, $fixed-side-safe-width);
  margin: 0 auto;
  padding-inline: $detail-content-padding;
  box-sizing: border-box;

  @media (max-width: 992px) {
    // 小屏下 DetailContent 退回单列 min(90%, 1000px)，评论区跟上同一档位，
    // 但额外用 $fixed-side-safe-width 兜底，确保左侧 DetailPanel 不会被盖住。
    max-width: min(90%, 1000px, $fixed-side-safe-width);
    padding-inline: 0;
  }
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
