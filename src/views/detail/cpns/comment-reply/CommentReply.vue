<template>
  <div class="comment-reply">
    <template v-for="(item, index) in commentReply(comment)" :key="index">
      <!-- 前两条评论 -->
      <template v-if="index < 2"><CommentReplyItem :item="item" :fatherComment="comment" /></template>
      <!-- 后面评论仅在展开后展示 -->
      <template v-if="index >= 2 && collapse"><CommentReplyItem :item="item" :fatherComment="comment" /></template>
    </template>
    <!-- 展示折叠回复按钮---------------------------------------------------------------- -->
    <div v-if="commentReply(comment).length > 2" @click="collapse = !collapse" class="collapse">
      <template v-if="!collapse">
        <span>查看更多回复</span><el-icon><ArrowDown /> </el-icon>
      </template>
      <template v-else>
        <span>收起回复</span><el-icon><ArrowUp /> </el-icon>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import CommentReplyItem from './CommentReplyItem.vue';

import useCommentStore from '@/stores/comment';
const commentStore = useCommentStore();
const { commentReply } = storeToRefs(commentStore);
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue';

const props = defineProps({
  comment: {
    type: Object,
    default: () => {}
  }
});
const collapse = ref(false);
</script>

<style lang="scss" scoped>
.comment-reply {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  // max-height: 600px;
  // overflow-y: scroll;
  .collapse {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    background-color: rgba(247, 248, 250, 0.7);
  }
}
</style>
