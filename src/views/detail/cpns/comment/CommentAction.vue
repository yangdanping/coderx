<template>
  <div class="comment-action">
    <!-- 点赞 -->
    <div class="action-item" @click="handleLike">
      <Icon type="like" :isActive="isLiked" :label="comment.likes ? String(comment.likes) : '点赞'" />
    </div>

    <!-- 回复 -->
    <div class="action-item" @click="handleReply">
      <Icon type="comment" :label="isActiveReply ? '取消回复' : '回复'" :isActive="isActiveReply" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import Icon from '@/components/icon/Icon.vue';
import { useLikeComment, useUserLikedComments } from '@/composables/useCommentList';
import useCommentStore from '@/stores/comment.store';
import useUserStore from '@/stores/user.store';
import useRootStore from '@/stores/index.store';
import debounce from '@/utils/debounce';
import type { IComment } from '@/service/comment/comment.request';

const props = defineProps<{
  comment: IComment;
  parentCommentId?: number; // 如果是回复，传入父评论ID
}>();

const route = useRoute();
const userStore = useUserStore();
const rootStore = useRootStore();
const commentStore = useCommentStore();

const articleId = computed(() => String(route.params.articleId || ''));
const parentId = computed(() => props.parentCommentId);

// 是否正在回复当前评论
const isActiveReply = computed(() => commentStore.activeReplyId === props.comment.id);

// 获取用户点赞列表
const { isLiked: checkIsLiked } = useUserLikedComments();

// 是否已点赞
const isLiked = computed(() => checkIsLiked(props.comment.id));

// 点赞 mutation（传入父评论ID用于刷新回复列表）
const likeMutation = useLikeComment(articleId, parentId);

// 处理点赞
const handleLike = debounce(() => {
  // 检查是否登录
  if (!userStore.token) {
    rootStore.toggleLoginDialog();
    return;
  }

  likeMutation.mutate(props.comment.id);
});

// 处理回复
const handleReply = () => {
  // 检查是否登录
  if (!userStore.token) {
    rootStore.toggleLoginDialog();
    return;
  }

  // 切换回复状态
  commentStore.setActiveReply(props.comment.id);
};
</script>

<style lang="scss" scoped>
.comment-action {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 8px;

  .action-item {
    cursor: pointer;
  }
}
</style>
