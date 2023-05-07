<template>
  <div class="reply">
    <Avatar :info="item.user" :size="35" />
    <div class="reply-box">
      <div class="user-info-box">
        <span class="name">{{ item.user.name }}</span>
        <el-tag v-if="isAuthor(item.user.id)" size="small">作者</el-tag>
        <span>回复:</span><span class="name">{{ fatherComment.user.name }}</span>
        <span class="created">{{ item.createAt }}</span>
      </div>
      <div class="reply-content">
        <div class="editor-content-view content" :style="item.status === '1' ? 'color: red' : ''" v-dompurify-html="item.content"></div>
        <CommentAction :comment="item" />
      </div>
      <CommentForm v-if="replythis(item.id)" :commentId="commentId" />
      <!-- <CommentChildReply v-if="childReply(item)" :replyInfo="childReply(item)" /> -->
    </div>
    <CommentTools :editData="item.content" :commentId="item.id" :userId="item.user.id" />
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import Avatar from '@/components/avatar/Avatar.vue';

import CommentForm from '../comment/CommentForm.vue';
import CommentTools from '../comment/CommentTools.vue';
import CommentAction from '../comment/CommentAction.vue';

import useArticleStore from '@/stores/article';
const articleStore = useArticleStore();
const { isAuthor } = storeToRefs(articleStore);

const props = defineProps({
  item: {
    type: Object,
    default: () => {}
  },
  fatherComment: {
    type: Object,
    default: () => {}
  }
});

const isReply = ref(false); //组件内部变量
const commentId = ref<any>('');

onMounted(() => {
  emitter.on('collapse', (comment: any) => {
    console.log('回复列表 collapse', comment);
    const { id } = comment; //id是回复本身的id
    commentId.value = id; //每次点击回复传来的commentId,而watch监控了这个commentId,当该form为打开状态时点击其他回复(旧值有,新旧值不同且!this.isReply为true),则折叠其他form,并打开这个form
    if (id) {
      // emitter.emit('collapseReply', null); //把其他所有打开的子评论折叠
      isReply.value = !isReply.value; //一点击isReply就取反,isReply控制form的显示
    }
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
.reply {
  display: flex;
  background-color: rgba(247, 248, 250, 0.7);
  padding: 15px 15px;
  .reply-box {
    display: flex;
    flex-direction: column;
    margin-left: 15px;
    width: 100%;
    .user-info-box {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      span {
        margin-right: 8px;
      }
      .name {
        font-weight: 700;
        font-size: 15px;
      }
      .created {
        font-size: 13px;
      }
    }
    .reply-content {
      margin: 10px 0;

      .content {
        padding: 20px 0;
      }
    }
  }
}
.reply:hover {
  .comment-tools {
    display: block;
  }
}
@media screen and (max-width: 760px) {
  .comment-tools {
    display: block;
  }
}
</style>
