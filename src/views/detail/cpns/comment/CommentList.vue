<template>
  <div ref="listRef" class="comment-list">
    <span class="comment-title">最近评论({{ commentInfo.length }})</span>
    <template v-for="(item, index) in commentInfo" :key="item.id">
      <CommentListItem :item="item" :floor="commentInfo.length - index" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import CommentListItem from './CommentListItem.vue';

import type { IComment } from '@/stores/types/comment.result';

const props = defineProps({
  commentInfo: {
    type: Array as PropType<IComment[]>,
    default: () => []
  }
});
const listRef = ref();

onMounted(() => {
  emitter.on('gotoCom', () => {
    listRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
});
onUnmounted(() => {
  emitter.off('gotoCom');
});
</script>

<style lang="scss" scoped>
.comment-list {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  margin-bottom: 300px;
  border-radius: 5px;
  padding: 10px;
}
.comment-title {
  font-weight: 300;
  font-size: 30px;
}
</style>
