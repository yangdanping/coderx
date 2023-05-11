import { defineStore } from 'pinia';
import { getComment, addComment, updateComment, removeComment, addReply, like } from '@/service/comment/comment.request';
import { getLiked } from '@/service/user/user.request.js';
import { Msg, emitter, timeFormat } from '@/utils';

import type { IComment } from './types/comment.result';
import useUserStore from './user';

export const useCommentStore = defineStore('comment', {
  state: () => ({
    commentInfo: [] as IComment[],
    replyInfo: [] as IComment[],
    replyInfo2: [] as IComment[],
    commentCount: 0,
    commentLikedId: [] as number[] //该用户点赞过的评论id,通过computed计算是否有点赞
  }),
  getters: {
    isCommentUserLiked() {
      return (commentId) => {
        return { liked: this.commentLikedId.some((id) => id === commentId) };
      };
    },
    commentReply() {
      return (comment) => this.replyInfo.filter((reply) => reply.cid === comment.id);
    },
    commentReply2() {
      return (comment) => {
        const arr: IComment[] = [];
        const replyInfo2: IComment[] = this.replyInfo2
          .filter((reply) => reply.rid === comment.id)
          .map((reply: IComment) => {
            const replyedObj = this.replyInfo2.find((item) => item.rid === reply.id);
            if (replyedObj) {
              arr.push(replyedObj);
              reply.childReply = arr;
            }
            return reply;
          });

        if (replyInfo2.length) {
          console.log('commentReply2', replyInfo2);
        }
        return replyInfo2;
      };
    }
  },
  actions: {
    getCommentInfo(totalCommentInfo) {
      totalCommentInfo.forEach((comment) => (comment.createAt = timeFormat(comment.createAt)));
      this.commentCount = totalCommentInfo.length;
      this.commentInfo = totalCommentInfo.filter((comment) => !comment.cid); //对文章的普通评论
      this.replyInfo = totalCommentInfo.filter((comment) => comment.cid && !comment.rid); //对评论的普通回复
      this.replyInfo2 = totalCommentInfo.filter((comment) => comment.cid && comment.rid); //对回复的回复
      console.log('对文章的普通评论--------------', this.commentInfo);
      console.log('对评论的普通回复--------------', this.replyInfo);
      console.log('对回复的回复--------------', this.replyInfo2);
    },
    getCommentLikedId(commentLiked) {
      this.commentLikedId = commentLiked;
      // console.log('getCommentLikedId', this.commentLikedId);
    },
    // 异步请求action---------------------------------------------------
    async getCommentAction(articleId) {
      // 1.获取文章的评论列表信息
      const res = await getComment(articleId);
      res.code === 0 ? this.getCommentInfo(res.data) : Msg.showFail('获取文章评论失败');
      // 2.若用户登录获取登录用户点赞过哪些评论
      this.refreshLikeAction();
    },
    async refreshLikeAction() {
      const userId = useUserStore().userInfo.id;
      const res = await getLiked(userId);
      res.code === 0 && this.getCommentLikedId(res.data.commentLiked); //重新获取评论数据
    },
    async commentAction(payload) {
      const { articleId, cid, rid } = payload;
      if (!cid && !rid) {
        console.log('我是一条即将发出的对文章的普通评论', payload);
        const res = await addComment(payload);
        if (res.code === -1) {
          Msg.showFail(`发布评论失败 ${res.msg}`);
        } else if (res.code === 0) {
          emitter.emit('cleanContent');
          Msg.showSuccess('发表评论成功');
          this.getCommentAction(articleId);
        } else {
          Msg.showFail('发表评论失败');
        }
      } else {
        console.log('我是对评论的回复', payload);
        const res = await addReply(payload);
        if (res.code === -1) {
          Msg.showFail(`发布回复失败 ${res.msg}`);
        } else if (res.code === 0) {
          emitter.emit('cleanContent');
          emitter.emit('collapse', null); //关闭评论框
          emitter.emit('collapseReply', null); //关评论框闭
          Msg.showSuccess('发表回复成功');
          this.getCommentAction(articleId);
        } else {
          Msg.showFail('发表回复失败');
        }
      }
    },
    async updateCommentAction(payload) {
      const res1 = await updateComment(payload);
      if (res1.code === 0) {
        Msg.showSuccess('修改评论成功');
        const { articleId } = payload;
        const res2 = await getComment(articleId); //重新获取评论数据
        res2.code === 0 ? this.getCommentInfo(res2.data) : Msg.showFail('获取评论列表失败');
      } else {
        Msg.showFail('修改评论失败');
      }
    },
    async removeCommentAction(payload) {
      const { commentId } = payload;
      const res1 = await removeComment(commentId);
      if (res1.code === 0) {
        Msg.showSuccess('删除评论成功');
        const { articleId } = payload;
        const res2 = await getComment(articleId); //重新获取评论数据
        res2.code === 0 ? this.getCommentInfo(res2.data) : Msg.showFail('获取评论列表失败');
      } else {
        Msg.showFail('删除评论失败');
      }
    },
    async likeAction(payload) {
      const { articleId } = payload;
      const res = await like(payload);
      if (res.code === 0) {
        this.getCommentAction(articleId);
        Msg.showSuccess('点赞评论成功');
      } else {
        this.getCommentAction(articleId);
        Msg.showSuccess('取消点赞成功');
      }
    }
  }
});

export default useCommentStore;
