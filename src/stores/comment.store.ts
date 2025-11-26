import { defineStore } from 'pinia';
import { getUserCommentList, likeComment } from '@/service/comment/comment.request';
import { getLiked } from '@/service/user/user.request';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import { Msg } from '@/utils';

/**
 * 评论 Store
 * 注意：主要的数据获取和操作逻辑已迁移到 composables/useCommentList.ts
 * 此 Store 仅用于存储一些需要跨组件共享的状态
 */
const useCommentStore = defineStore('comment', {
  state: () => ({
    userComments: [], // 用户历史评论
    userLikedCommentIdList: [] as number[], // 用户点赞过的评论ID列表
    // 当前正在回复的评论ID（用于控制回复表单的显示）
    activeReplyId: null as number | null,
    // 当前正在编辑的评论ID
    activeEditId: null as number | null,
  }),
  getters: {
    // 判断某条评论是否被当前用户点赞
    isCommentUserLiked() {
      return (commentId) => {
        return this.userLikedCommentIdList.some((id) => id === commentId);
      };
    },
  },
  actions: {
    /**
     * 设置当前正在回复的评论
     */
    setActiveReply(commentId: number | null) {
      // 如果点击同一个，则关闭
      if (this.activeReplyId === commentId) {
        this.activeReplyId = null;
      } else {
        this.activeReplyId = commentId;
        // 打开回复时关闭编辑
        this.activeEditId = null;
      }
    },
    /**
     * 设置当前正在编辑的评论
     */
    setActiveEdit(commentId: number | null) {
      if (this.activeEditId === commentId) {
        this.activeEditId = null;
      } else {
        this.activeEditId = commentId;
        // 打开编辑时关闭回复
        this.activeReplyId = null;
      }
    },
    /**
     * 关闭所有表单
     */
    closeAllForms() {
      this.activeReplyId = null;
      this.activeEditId = null;
    },
    /**
     * 获取评论列表Action
     * 目前主要用于获取用户历史评论
     */
    async getCommentAction(articleId = '', userId: number | string = '') {
      // 1. 获取分页信息
      const rootStore = useRootStore();
      const { pageNum, pageSize } = rootStore;

      // 2. 如果指定了 userId，获取用户历史评论
      if (userId) {
        const res = await getUserCommentList({
          userId: Number(userId),
          pageNum,
          pageSize,
        });

        if (res.code === 0) {
          this.userComments = res.data as any;
          // 获取完评论列表后，如果用户已登录，获取用户的点赞列表
          const userStore = useUserStore();
          if (userStore.token) {
            this.getUserLikedAction();
          }
        } else {
          Msg.showFail('获取用户评论失败');
        }
      }
    },
    /**
     * 获取用户点赞过的评论列表
     */
    async getUserLikedAction() {
      const userId = useUserStore().userInfo?.id;
      const res = await getLiked(userId);
      if (res.code === 0) {
        this.userLikedCommentIdList = res.data.commentLiked || [];
      }
    },
    /**
     * 点赞评论 Action
     * @param comment 评论对象
     * @param inArticle 是否在文章详情页（如果在文章页，可能需要更新文章维度的评论点赞信息，目前保留参数兼容性）
     */
    async likeAction(comment: any, inArticle = true) {
      const { id } = comment;
      const res = await likeComment(id);

      if (res.code === 0) {
        const { liked, likes } = res.data;
        liked ? Msg.showSuccess('已点赞该评论') : Msg.showInfo('已取消点赞该评论');

        // 1. 更新当前列表中的点赞数
        const targetComment = this.userComments.find((c: any) => c.id === id);
        if (targetComment) {
          (targetComment as any).likes = likes;
        }

        // 2. 刷新用户点赞列表状态
        this.getUserLikedAction();
      } else {
        Msg.showFail('操作失败，请重试');
      }
    },
  },
});

export default useCommentStore;
