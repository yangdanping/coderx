<template>
  <div class="comment-list-item">
    <Avatar :info="item.user" />
    <div class="comment-box">
      <div class="user-info-box">
        <div class="user-info">
          <div class="name">{{ item.user.name }}</div>
          <el-tag v-if="isAuthor(item.user.id)" size="small">作者</el-tag>
        </div>
        <div class="floor">
          <span style="margin-right: 10px">{{ floor }}楼</span>
          <span>{{ item.createAt }}</span>
        </div>
      </div>
      <div class="comment-content">
        <div class="editor-content-view" :style="item.status === '1' ? 'color: red' : ''" v-dompurify-html="item.content"></div>
        <CommentAction :comment="item" />
      </div>
      <CommentForm v-if="replythis(item.id)" :commentId="commentId" :isReply="true" />
      <CommentReply :comment="item" />
    </div>
    <CommentTools :editData="item.content" :commentId="item.id" :userId="item.user.id" />
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

import CommentForm from './CommentForm.vue';
import CommentTools from './CommentTools.vue';
import CommentAction from './CommentAction.vue';
import CommentReply from '../comment-reply/CommentReply.vue';

import useArticleStore from '@/stores/article';

import { emitter } from '@/utils';

const props = defineProps({
  item: {
    type: Object,
    default: () => {}
  },
  floor: {
    type: Number
  }
});

const isReply = ref(false);
const commentId = ref<any>('');

const articleStore = useArticleStore();
const { isAuthor } = storeToRefs(articleStore);

onMounted(() => {
  emitter.on('collapse', (comment: any) => {
    if (comment) {
      console.log('评论列表 collapse', comment);
      const { id } = comment;
      commentId.value = id;
    }

    isReply.value = !isReply.value; //一点击isReply就取反
  });
});

watch(
  () => commentId.value,
  (newV, oldV) => {
    if (oldV !== '' && newV !== oldV && !isReply.value) {
      isReply.value = !isReply.value; //只有评论区某form处于打开情况下,点击其他回复才会来到这里,折叠其他form,并打开这个form
    }
  }
);

const replythis = computed(() => {
  return (itemId) => (commentId.value === itemId ? isReply.value : false);
});
</script>

<style lang="scss" scoped>
.comment-list-item {
  display: flex;
  border-bottom: 1px solid #e5e6eb;
  margin-top: 20px;

  .comment-box {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
    width: 100%;
    .user-info-box {
      display: flex;
      flex-direction: column;
      .user-info {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
        .name {
          font-weight: 700;
          font-size: 20px;
          margin-right: 5px;
        }
      }
      .floor {
        font-size: 13px;
      }
    }

    .comment-content {
      padding: 20px 0;
    }
  }
}
</style>
