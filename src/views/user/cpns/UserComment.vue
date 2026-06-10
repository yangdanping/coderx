<template>
  <div class="user-comment">
    <div class="list-header">
      <h2>{{ sex }}的评论({{ profile.commentCount }})</h2>
    </div>
    <div class="list">
      <el-skeleton v-if="isPending" animated :rows="5" />

      <div v-else-if="isError" class="list-state error-state">
        加载失败: {{ error?.message }}
        <el-button class="retry-button" link type="primary" @click="() => refetch()">重试</el-button>
      </div>

      <div v-else-if="!items.length" class="list-state">这个人未发表过评论</div>

      <template v-else>
        <ListItem v-for="item in items" :key="item.id" :item="item" isComment>
          <template #action>
            <CommentAction :comment="item" :isLiked="isLiked" :onLike="likeComment" />
          </template>
        </ListItem>

        <el-skeleton v-if="isFetchingNextPage" animated :rows="1" />
        <div v-else-if="!hasNextPage" class="list-state">没有更多了</div>
      </template>

      <div ref="infiniteSentinel" class="infinite-sentinel"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ListItem from '@/components/list/ListItem.vue';
import CommentAction from '@/components/list/cpns/CommentAction.vue';
import {
  useLikeUserComment,
  useUserCommentList,
  useUserLikedComments,
} from '@/composables/useCommentList';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import useUserStore from '@/stores/user.store';

const userStore = useUserStore();
const { profile } = storeToRefs(userStore);
const userId = computed(() => profile.value.id);
const {
  items,
  fetchNextPage,
  hasNextPage,
  isPending,
  isFetchingNextPage,
  isError,
  error,
  refetch,
} = useUserCommentList(userId);
const { isLiked } = useUserLikedComments();
const { mutate: likeComment } = useLikeUserComment();
const { infiniteSentinel } = useInfiniteScroll({
  canLoadMore: hasNextPage,
  isLoading: isFetchingNextPage,
  loadMore: fetchNextPage,
});

const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
</script>

<style lang="scss" scoped>
.user-comment {
  .list-header {
    @include thin-border(bottom, var(--border-color-list));
    padding-bottom: 10px;
    padding-left: 10px;
  }

  .list {
    padding: 0 20px;
  }

  .list-state {
    padding: 20px 0;
    color: #999;
    text-align: center;
  }

  .error-state {
    color: var(--el-color-danger);
  }

  .infinite-sentinel {
    width: 100%;
    height: 1px;
  }
}
</style>
