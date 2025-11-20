import { defineStore } from 'pinia';
import { getComment, addComment, updateComment, removeComment, addReply, likeComment, getCommentById } from '@/service/comment/comment.request';
import { getLiked } from '@/service/user/user.request.js';
import { Msg, emitter, dateFormat } from '@/utils';

import type { IComment } from './types/comment.result';
import useUserStore from './user.store';
import useRootStore from './index.store';

const useCommentStore = defineStore('comment', {
  state: () => ({
    commentInfo: [] as IComment[],
    replyInfo: [] as IComment[],
    replyInfo2: [] as IComment[],
    userComments: [] as IComment[],
    commentCount: 0,
    userLikedCommentIdList: [] as number[], //该用户点赞过的评论id,通过computed计算是否有点赞
  }),
  getters: {
    isCommentUserLiked() {
      return (commentId) => {
        return this.userLikedCommentIdList.some((id) => id === commentId);
      };
    },
    commentReply() {
      return (comment: IComment) => this.replyInfo.filter((reply: IComment) => reply.cid === comment.id);
    },
    commentReply2() {
      return (comment: IComment) => {
        const arr: IComment[] = [];
        const replyInfo2: IComment[] = this.replyInfo2
          .filter((reply: IComment) => reply.rid === comment.id)
          .map((reply: IComment) => {
            const replyedObj = this.replyInfo2.find((item) => item.rid === reply.id);
            if (replyedObj) {
              arr.push(replyedObj);
              reply.childReply = arr;
            }
            return reply;
          });
        return replyInfo2;
      };
    },
  },
  actions: {
    getTotalCommentInfo(totalCommentInfo, isUser: boolean = false) {
      this.commentCount = totalCommentInfo.length;
      if (isUser) {
        this.userComments = totalCommentInfo;
        console.log('对用户评论的请求', this.userComments);
      } else {
        this.commentInfo = totalCommentInfo.filter((comment) => !comment.cid); //对文章的普通评论
        this.replyInfo = totalCommentInfo.filter((comment) => comment.cid && !comment.rid); //对评论的普通回复
        this.replyInfo2 = totalCommentInfo.filter((comment) => comment.cid && comment.rid); //对回复的回复
        console.log('对文章的普通评论--------------', this.commentInfo);
        console.log('对评论的普通回复--------------', this.replyInfo);
        console.log('对回复的回复--------------', this.replyInfo2);
      }
    },
    updateArticleComment(upatedComment: IComment, prop: string) {
      const { id, cid, rid } = upatedComment;
      const commentType = !cid ? 'commentInfo' : cid && !rid ? 'replyInfo' : 'replyInfo2';
      this[commentType].find((comment) => {
        if (comment.id === id) {
          comment[prop] = upatedComment[prop];
          return true; //中断
        }
      });
    },
    updateUserComment(upatedComment: IComment, prop: any) {
      this.userComments.find((comment) => {
        if (comment.id === upatedComment.id) {
          comment[prop] = upatedComment[prop];
          return true;
        }
      });
    },
    // 异步请求action---------------------------------------------------
    async getCommentAction(articleId = '', userId = '') {
      // 1.获取文章的评论列表信息
      const { pageNum, pageSize } = useRootStore();
      const data = { pageNum, pageSize, articleId, userId };
      const res = await getComment(data);
      res.code === 0 ? this.getTotalCommentInfo(res.data, !!userId) : Msg.showFail('获取文章评论失败');
      // 2.若用户登录获取登录用户点赞过哪些评论
      this.getUserLikedAction();
    },
    async getUserLikedAction() {
      const userId = useUserStore().userInfo.id;
      const res = await getLiked(userId);
      if (res.code === 0) {
        this.userLikedCommentIdList = res.data.commentLiked;
      }
    },
    async commentAction(payload) {
      const { articleId, cid } = payload;
      const isNormalComment = !cid;
      const res = isNormalComment ? await addComment(payload) : await addReply(payload);
      if (res.code === 0) {
        emitter.emit('cleanContent');
        emitter.emit('collapse', null); //关闭评论框
        Msg.showSuccess('发表评论成功');
        this.getCommentAction(articleId);
      } else {
        Msg.showFail('发表评论失败');
      }
    },
    async likeAction(comment, inArticle = true) {
      const { id } = comment;
      const res = await likeComment(id);
      if (res.code === 0) {
        // 根据返回的 liked 状态显示对应提示
        res.data.liked ? Msg.showSuccess('已点赞该评论') : Msg.showInfo('已取消点赞该评论');
        // 直接使用返回的点赞总数更新UI（不需要额外请求）
        const upatedComment = { id, likes: res.data.likes };
        inArticle ? this.updateArticleComment(upatedComment, 'likes') : this.updateUserComment(upatedComment, 'likes');
        // 更新用户点赞列表
        this.getUserLikedAction();
      } else {
        Msg.showFail('操作失败，请重试');
      }
    },
    async updateCommentAction(payload) {
      const { commentId } = payload;
      const res1 = await updateComment(payload);
      if (res1.code === 0) {
        Msg.showSuccess('修改评论成功');
        // this.getCommentAction(articleId); //重新获取评论数据
        this.updateCommentByIdAction(commentId, 'content');
      } else {
        Msg.showFail('修改评论失败');
      }
    },
    async removeCommentAction(payload) {
      const { commentId, articleId } = payload;
      const res1 = await removeComment(commentId);
      if (res1.code === 0) {
        Msg.showSuccess('删除评论成功');
        this.getCommentAction(articleId); //重新获取评论数据
      } else {
        Msg.showFail('删除评论失败');
      }
    },
    async updateCommentByIdAction(id, updateProp: string, inArticle = true) {
      const res = await getCommentById(id);
      if (res.code === 0) {
        const upatedComment = res.data;
        console.log('upatedComment', upatedComment);
        inArticle ? this.updateArticleComment(upatedComment, updateProp) : this.updateUserComment(upatedComment, updateProp); //传入comment是为了判断类型
        this.getUserLikedAction(); //更新用户点赞列表
      }
    },
    // async likeAction(payload) {
    //   const { articleId } = payload;
    //   const res = await like(payload);
    //   if (res.code === 0) {
    //     this.getCommentAction(articleId);
    //     Msg.showSuccess('点赞评论成功');
    //   } else {
    //     this.getCommentAction(articleId);
    //     Msg.showSuccess('取消点赞成功');
    //   }
    // }
  },
});

export default useCommentStore;
