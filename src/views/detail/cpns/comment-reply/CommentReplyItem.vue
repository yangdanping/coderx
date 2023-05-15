<template>
  <div class="reply-list-item">
    <Avatar :info="item.author" :size="35" />
    <div class="reply-box">
      <div class="user-info-box">
        <div class="user-info">
          <div class="name">
            <span>
              {{ item.author?.name }}
              <el-tag v-if="isAuthor(item.author?.id)" size="small">作者</el-tag>
            </span>
            <span>
              回复:
              {{ fatherComment.author?.name }}
              <el-tag v-if="isAuthor(fatherComment.author?.id)" size="small">作者</el-tag>
            </span>
          </div>
        </div>
        <div class="floor">
          <span>{{ item.createAt }}</span>
        </div>
      </div>
      <div class="editor-content">
        <div class="editor-content-view" :style="item.status === '1' ? 'color: red' : ''" v-dompurify-html="item.content"></div>
        <CommentAction :comment="item" />
      </div>
      <CommentForm v-if="replythis(item.id)" :commentId="commentId" :replyId="replyId" />
      <!-- <CommentChildReply :comment="item" /> -->
      <!-- 使用递归组件-------------------------------- -->
      <CommentReply :comment="item" :isReply="true" />
    </div>
    <CommentTools :editData="item.content" :commentId="item.id" :userId="item.author?.id" />
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import Avatar from '@/components/avatar/Avatar.vue';

import CommentAction from '@/components/list/cpns/CommentAction.vue';
import CommentForm from '../comment/CommentForm.vue';
import CommentTools from '../comment/CommentTools.vue';
// import CommentChildReply from '../comment-child-reply/CommentChildReply.vue';
import CommentReply from './CommentReply.vue';

import useArticleStore from '@/stores/article';
const articleStore = useArticleStore();
const { isAuthor } = storeToRefs(articleStore);

import type { IComment } from '@/stores/types/comment.result';

const props = defineProps({
  item: {
    type: Object as PropType<IComment>,
    default: () => {}
  },
  fatherComment: {
    type: Object as PropType<IComment>,
    default: () => {}
  }
});

const isReply = ref(false); //组件内部变量
const commentId = ref<any>('');
const replyId = ref<any>('');

onMounted(() => {
  emitter.on('collapse', (comment: any) => {
    if (comment) {
      const { id, cid } = comment; //id是回复本身的id
      console.log('回复列表 collapse', comment, cid);
      commentId.value = id; //每次点击回复传来的commentId,而watch监控了这个commentId,当该form为打开状态时点击其他回复(旧值有,新旧值不同且!this.isReply为true),则折叠其他form,并打开这个form
      if (cid) {
        replyId.value = cid;
      }
    }
    isReply.value = !isReply.value; //一点击isReply就取反,isReply控制form的显示
    //id && emitter.emit('collapseReply', null); //把其他所有打开的子评论折叠
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
@import '@/assets/css/editor';
.reply-list-item {
  display: flex;
  /* background-color: rgba(220, 230, 220, 0.7); //与文章评论颜色做区分 */
  background-image: linear-gradient(90deg, #e0f3e0b3, #f4fef4b3); //与文章评论颜色做区分
  padding: 10px;

  .reply-box {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
    width: 100%;
    .user-info-box {
      display: flex;
      align-items: center;
      padding-top: 5px;
      .user-info {
        display: flex;
        align-items: center;
        .name span:not(.el-tag) {
          font-weight: 700;
          font-size: 15px;
        }
      }
      .floor span {
        margin-left: 10px;
        font-size: 10px;
      }
    }
    .editor-content {
      padding: 10px 0;
    }
  }
}
</style>
