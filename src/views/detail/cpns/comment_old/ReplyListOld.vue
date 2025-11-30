<template>
  <div class="comment-reply">
    <template v-if="!showOne">
      <template v-for="(item, index) in reply" :key="index">
        <!-- 前两条评论 -->
        <template v-if="index < 2"><ReplyItem :item="item" :fatherComment="fatherComment(item)" /></template>
        <!-- 后面评论仅在展开后展示 -->
        <template v-if="index >= 2 && collapse"><ReplyItem :item="item" :fatherComment="fatherComment(item)" /></template>
      </template>
      <!-- 展示折叠回复按钮---------------------------------------------------------------- -->
      <div v-if="reply.length > 2" @click="collapse = !collapse" class="collapse">
        <template v-if="!collapse">
          <span>查看更多回复</span><el-icon><IArrowDown /> </el-icon>
        </template>
        <template v-else>
          <span>收起回复</span><el-icon><IArrowUp /> </el-icon>
        </template>
      </div>
    </template>
    <template v-else>
      <ReplyItem :item="reply[0]" :fatherComment="fatherComment(reply[0])" />
    </template>
    <!-- 展开线---------------------------------------------------- -->
    <template v-if="reply.length > 1">
      <el-tooltip class="item" effect="dark" :content="`${showOne ? '展开' : '折叠'}评论`" placement="left">
        <span class="line" @click="showOne = !showOne">
          <el-icon v-show="showOne" class="icon"><IDCaret /></el-icon>
        </span>
      </el-tooltip>
    </template>
  </div>
</template>

<script lang="ts" setup>
import ReplyItem from './ReplyItemOld.vue';

import useCommentStore from '@/stores/comment.store.old';
const commentStore = useCommentStore();
const { getRepliesForComment, getRepliesForReply } = storeToRefs(commentStore);

import type { ICommentOld } from '@/stores/types/comment.result';

const { comment = {}, isReply = false } = defineProps<{
  comment?: ICommentOld;
  isReply?: boolean;
}>();

const showOne = ref(false);

const fatherComment = computed(() => {
  return (item) => {
    if (!item?.childReply) {
      return comment;
    } else {
      return item.childReply;
    }
  };
});
const reply = computed(() => {
  if (!isReply) {
    return getRepliesForComment.value(comment);
  } else {
    return getRepliesForReply.value(comment);
  }
});
const collapse = ref(false);
</script>

<style lang="scss" scoped>
.comment-reply {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  // max-height: 600px;
  // overflow-y: scroll;

  .line {
    position: absolute;
    left: 0;
    bottom: 50%;
    transform: translateY(50%);
    height: 100%;
    display: flex;
    width: 3px;
    background: #a8d9b6;
    cursor: pointer;
    .icon {
      position: absolute;
      right: 5px;
      color: #a8d9b6;
      font-size: 20px;
    }
  }
  .line:hover {
    background: #449b5c;
  }
  .collapse {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    background-color: rgba(247, 248, 250, 0.7);
  }
}
</style>
