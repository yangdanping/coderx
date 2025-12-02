import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  getCommentList,
  getReplies,
  addComment,
  addReply,
  likeComment,
  updateComment,
  deleteComment,
  type IComment,
  type ICommentListResponse,
  type IRepliesResponse,
} from '@/service/comment/comment.request';
import { getLiked } from '@/service/user/user.request';
import { Msg, emitter } from '@/utils';
import useUserStore from '@/stores/user.store';
import type { Ref } from 'vue';

// ==================== Query Keys ====================
export const commentKeys = {
  all: ['comments'] as const,
  list: (articleId: string) => [...commentKeys.all, 'list', articleId] as const,
  replies: (commentId: number) => [...commentKeys.all, 'replies', commentId] as const,
  userLiked: (userId: number) => [...commentKeys.all, 'userLiked', userId] as const,
};

// ==================== 一级评论列表 ====================

/**
 * 获取一级评论列表（分页）
 * @param articleId 文章ID（响应式）
 * @param limit 每页数量，默认5
 */
export function useCommentList(articleId: string, limit = 5) {
  return useInfiniteQuery({
    queryKey: commentKeys.list(articleId),
    queryFn: async ({ pageParam }) => {
      const res = await getCommentList({
        articleId,
        cursor: pageParam as string | null,
        limit,
      });
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ICommentListResponse) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    enabled: computed(() => !!articleId),
  });
}

// ==================== 回复列表 ====================

/**
 * 获取某条评论的回复列表（分页）
 * @param commentId 一级评论ID（响应式）
 * @param limit 每页数量，默认10
 * @param enabled 是否启用查询
 */
export function useReplyList(commentId: Ref<number>, limit = 10, enabled: Ref<boolean> = ref(true)) {
  return useInfiniteQuery({
    queryKey: commentKeys.replies(commentId.value),
    queryFn: async ({ pageParam }) => {
      const res = await getReplies({
        commentId: commentId.value,
        cursor: pageParam as string | null,
        limit,
      });
      return res.data;
    },
    initialPageParam: null as string | null, // 起始游标通常是 null 或空字符串,逻辑：第一页(cursor=null) -> 返回下一页游标(cursor="xyz") -> 请求下一页(cursor="xyz")...
    getNextPageParam: (lastPage: IRepliesResponse) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    enabled: computed(() => !!commentId.value && enabled.value),
  });
}

// ==================== 用户点赞列表 ====================

/**
 * 获取当前用户点赞过的评论ID列表
 */
export function useUserLikedComments() {
  const userStore = useUserStore();
  const userId = computed(() => userStore.userInfo?.id);

  const query = useInfiniteQuery({
    queryKey: computed(() => commentKeys.userLiked(userId.value || 0)),
    queryFn: async () => {
      if (!userId.value) return { commentLiked: [] };
      const res = await getLiked(userId.value);
      return res.data;
    },
    initialPageParam: null,
    getNextPageParam: () => undefined, // 不分页
    enabled: computed(() => !!userId.value),
  });

  // 提取点赞的评论ID列表
  const likedCommentIds = computed(() => {
    const pages = query.data.value?.pages || [];
    return pages.flatMap((page) => page.commentLiked || []);
  });

  // 判断某条评论是否被点赞
  const isLiked = (commentId: number) => likedCommentIds.value.includes(commentId);

  return {
    ...query,
    likedCommentIds,
    isLiked,
  };
}

// ==================== Mutations ====================

/**
 * 新增一级评论
 */
export function useAddComment(articleId: Ref<string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => addComment({ articleId: articleId.value, content }),
    onSuccess: () => {
      Msg.showSuccess('发表评论成功');
      emitter.emit('cleanContent');
      // 重新获取评论列表
      queryClient.invalidateQueries({ queryKey: commentKeys.list(articleId.value) });
    },
    onError: () => {
      Msg.showFail('发表评论失败');
    },
  });
}

/**
 * 回复评论
 */
export function useAddReply(articleId: Ref<string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { commentId: number; content: string; replyId?: number }) => {
      return addReply(params.commentId, {
        articleId: articleId.value,
        content: params.content,
        replyId: params.replyId,
      });
    },
    onSuccess: (_, variables) => {
      Msg.showSuccess('回复成功');
      emitter.emit('cleanContent');
      emitter.emit('collapse', null); // 关闭评论框
      // 重新获取评论列表和回复列表
      queryClient.invalidateQueries({ queryKey: commentKeys.list(articleId.value) });
      queryClient.invalidateQueries({ queryKey: commentKeys.replies(variables.commentId) });
    },
    onError: () => {
      Msg.showFail('回复失败');
    },
  });
}

/**
 * 点赞评论（乐观更新）
 * @param articleId 文章ID
 * @param parentCommentId 可选，如果点赞的是回复，传入其父评论ID
 */
export function useLikeComment(articleId: Ref<string>, parentCommentId?: Ref<number | undefined>) {
  const queryClient = useQueryClient();
  const userStore = useUserStore();

  return useMutation({
    mutationFn: (commentId: number) => likeComment(commentId),
    // 乐观更新
    onMutate: async (commentId) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: commentKeys.list(articleId.value) });

      // 保存之前的数据用于回滚
      const previousData = queryClient.getQueryData(commentKeys.list(articleId.value));

      return { previousData };
    },
    onSuccess: (res) => {
      const { liked, likes } = res.data;
      liked ? Msg.showSuccess('已点赞该评论') : Msg.showInfo('已取消点赞该评论');

      // 更新用户点赞列表
      if (userStore.userInfo?.id) {
        queryClient.invalidateQueries({ queryKey: commentKeys.userLiked(userStore.userInfo.id) });
      }

      // 刷新回复列表（如果有父评论ID）
      if (parentCommentId?.value) {
        queryClient.invalidateQueries({ queryKey: commentKeys.replies(parentCommentId.value) });
      }
    },
    onError: (_, __, context) => {
      // 回滚
      if (context?.previousData) {
        queryClient.setQueryData(commentKeys.list(articleId.value), context.previousData);
      }
      Msg.showFail('操作失败，请重试');
    },
    onSettled: () => {
      // 重新验证数据
      queryClient.invalidateQueries({ queryKey: commentKeys.list(articleId.value) });
    },
  });
}

/**
 * 修改评论
 */
export function useUpdateComment(articleId: Ref<string>, parentCommentId?: Ref<number | undefined>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { commentId: number; content: string }) => {
      return updateComment(params.commentId, params.content);
    },
    onSuccess: () => {
      Msg.showSuccess('修改评论成功');
      queryClient.invalidateQueries({ queryKey: commentKeys.list(articleId.value) });
      // 刷新回复列表（如果有父评论ID）
      if (parentCommentId?.value) {
        queryClient.invalidateQueries({ queryKey: commentKeys.replies(parentCommentId.value) });
      }
    },
    onError: () => {
      Msg.showFail('修改评论失败');
    },
  });
}

/**
 * 删除评论
 */
export function useDeleteComment(articleId: Ref<string>, parentCommentId?: Ref<number | undefined>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      Msg.showSuccess('删除评论成功');
      queryClient.invalidateQueries({ queryKey: commentKeys.list(articleId.value) });
      // 刷新回复列表（如果有父评论ID）
      if (parentCommentId?.value) {
        queryClient.invalidateQueries({ queryKey: commentKeys.replies(parentCommentId.value) });
      }
    },
    onError: () => {
      Msg.showFail('删除评论失败');
    },
  });
}

// ==================== 辅助函数 ====================

/**
 * 从分页数据中提取所有评论
 */
export function flattenComments(data: { pages: ICommentListResponse[] } | undefined): IComment[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.items);
}

/**
 * 从分页数据中获取评论总数
 */
export function getTotalCount(data: { pages: ICommentListResponse[] } | undefined): number {
  if (!data?.pages || data.pages.length === 0) return 0;
  return data.pages[0]?.totalCount || 0;
}

/**
 * 从分页数据中提取所有回复
 */
export function flattenReplies(data: { pages: IRepliesResponse[] } | undefined): IComment[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.items);
}
