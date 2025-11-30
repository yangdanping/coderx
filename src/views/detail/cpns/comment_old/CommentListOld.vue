<template>
  <div class="comment-list">
    <span ref="listRef" class="comment-title">最新评论({{ commentCount }})</span>
    <template v-for="(item, index) in commentInfo" :key="item.id">
      <CommentListItem :item="item" :floor="commentInfo.length - index" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import CommentListItem from './CommentListItemOld.vue';

import type { ICommentOld } from '@/stores/types/comment.result';
import useCommentStore from '@/stores/comment.store.old';
const { commentCount } = storeToRefs(useCommentStore());
const { commentInfo = [] } = defineProps<{
  commentInfo?: ICommentOld[];
}>();
const listRef = ref<Element>();

onMounted(() => {
  emitter.on('gotoCom', () => {
    listRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
});
onBeforeUnmount(() => {
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
  padding-top: var(--navbarHeight); //设置navbar高度,使其gotoCom能完全显示评论区
}
</style>
