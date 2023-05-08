<template>
  <div class="reply-list-item">
    <Avatar :info="item.user" :size="35" />
    <div class="reply-box">
      <div class="user-info-box">
        <div class="user-info">
          <div class="name">{{ item.user.name }} 回复: {{ fatherComment.user.name }}</div>
          <el-tag v-if="isAuthor(item.user.id)" size="small">作者</el-tag>
        </div>
        <div class="floor">
          <span>{{ item.createAt }}</span>
        </div>
      </div>
      <div class="reply-content">
        <div class="editor-content-view" :style="item.status === '1' ? 'color: red' : ''" v-dompurify-html="item.content"></div>
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
.reply-list-item {
  display: flex;
  background-color: rgba(247, 248, 250, 0.7); //与文章评论颜色做区分
  padding: 10px;
  &:hover {
    .comment-tools {
      display: block;
    }
  }

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
        .name {
          font-weight: 700;
          font-size: 15px;
          margin-right: 5px;
        }
      }
    }
    .reply-content {
      padding: 20px 0;
    }
  }
}

@media screen and (max-width: 760px) {
  .comment-tools {
    display: block;
  }
}
</style>
