<template>
  <div class="thinking-shimmer-text" :style="{ '--color': color, '--shimmer-color': shimmerColor }">
    {{ text }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text?: string;
  color?: string;
  shimmerColor?: string;
}>();
</script>

<style scoped lang="scss">
.thinking-shimmer-text {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.3); // 默认文字设为半透明，作为底色
  background: linear-gradient(to right, var(--color) 0%, var(--color) 40%, var(--shimmer-color) 50%, var(--color) 60%, var(--color) 100%);
  background-size: 200% auto; // 拉长背景，让渐变有移动空间
  background-clip: text; // 核心：背景只显示在文字上
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; // 文字本身透明，透出背景
  animation: shimmer 2s linear infinite; // 纯 CSS 动画
}

@keyframes shimmer {
  to {
    background-position: 200% center;
  }
}
</style>
