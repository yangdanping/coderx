import { defineStore } from 'pinia';
import { getComment, addCommentOld, updateCommentOld, removeComment, addReplyOld, likeCommentOld, getCommentByIdOld } from '@/service/comment/comment.request.old';
import { getLiked } from '@/service/user/user.request.js';
import { Msg, emitter, dateFormat } from '@/utils';

import type { ICommentOld } from './types/comment.result';
import useUserStore from './user.store';
import useRootStore from './index.store';

const useCommentStore = defineStore('comment', {
  state: () => ({
    commentInfo: [] as ICommentOld[], // 一级评论 (对文章)
    replyInfo: [] as ICommentOld[], // 二级回复 (对一级评论)
    subReplyInfo: [] as ICommentOld[], // 三级及更深层回复 (对回复的回复)
    userComments: [] as ICommentOld[],
    commentCount: 0,
    userLikedCommentIdList: [] as number[], //该用户点赞过的评论id,通过computed计算是否有点赞
  }),
  getters: {
    isCommentUserLiked() {
      return (commentId) => {
        return this.userLikedCommentIdList.some((id) => id === commentId);
      };
    },
    /**
     * 获取指定一级评论(Comment)的所有直接回复(Reply)。
     * 这些回复通常是对文章评论的直接跟帖。
     */
    getRepliesForComment() {
      return (comment: ICommentOld) => this.replyInfo.filter((reply: ICommentOld) => reply.cid === comment.id);
    },
    /**
     * 获取指定二级回复(Reply)下的所有子回复(Sub-Reply)及后续对话链。
     * 逻辑说明：
     * 1. 筛选出所有回复了当前二级回复(comment)的三级回复。
     * 2. 尝试为这些三级回复寻找它们自己的回复（四级回复/对话），并挂载到 `childReply` 属性上。
     * 注意：这里的 `conversationChain` 变量在 map 外部定义，可能会导致所有同级回复共享同一个累积的子回复数组，
     * 这是一个用于平铺展示对话流的特殊逻辑。
     */
    getRepliesForReply() {
      return (comment: ICommentOld) => {
        // 用于收集当前对话链中的所有回复。
        // 注意：这个数组是在 map 外部定义的，这意味着对于给定的 `comment` (父回复)，
        // 它下面的所有直接子回复都会共享这个累积的 conversationChain 数组。
        // 这样做的效果是，所有属于同一对话流的回复会被串联起来，而不是形成严格的树状递归结构。
        // 用于平铺展示“楼中楼”的对话记录。
        const conversationChain: ICommentOld[] = []; // 存储一段连续的对话记录

        const subReplyInfo: ICommentOld[] = this.subReplyInfo
          .filter((reply: ICommentOld) => reply.rid === comment.id)
          .map((reply: ICommentOld) => {
            // 尝试找到这个回复的目标回复对象 (即它回复了谁)
            const replyTarget = this.subReplyInfo.find((item) => item.rid === reply.id);

            if (replyTarget) {
              conversationChain.push(replyTarget);
              // 将累积的对话链挂载到当前回复上
              // 这里利用了引用传递，reply.childReply 指向的是同一个 conversationChain 数组
              reply.childReply = conversationChain;
            }
            return reply;
          });
        return subReplyInfo;
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
        this.subReplyInfo = totalCommentInfo.filter((comment) => comment.cid && comment.rid); //对回复的回复
        console.log('对文章的普通评论--------------', this.commentInfo);
        console.log('对评论的普通回复--------------', this.replyInfo);
        console.log('对回复的回复--------------', this.subReplyInfo);
      }
    },
    updateArticleComment(upatedComment: ICommentOld, prop: string) {
      const { id, cid, rid } = upatedComment;
      const commentType = !cid ? 'commentInfo' : cid && !rid ? 'replyInfo' : 'subReplyInfo';
      this[commentType].find((comment) => {
        if (comment.id === id) {
          comment[prop] = upatedComment[prop];
          return true; //中断
        }
      });
    },
    updateUserComment(upatedComment: ICommentOld, prop: any) {
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
      const userId = useUserStore().userInfo?.id;
      const res = await getLiked(userId);
      if (res.code === 0) {
        this.userLikedCommentIdList = res.data.commentLiked;
      }
    },
    async commentAction(payload) {
      const { articleId, cid } = payload;
      const isNormalComment = !cid;
      const res = isNormalComment ? await addCommentOld(payload) : await addReplyOld(payload);
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
      const res = await likeCommentOld(id);
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
      const res1 = await updateCommentOld(payload);
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
      const res = await getCommentByIdOld(id);
      if (res.code === 0) {
        const upatedComment = res.data;
        console.log('upatedComment', upatedComment);
        inArticle ? this.updateArticleComment(upatedComment, updateProp) : this.updateUserComment(upatedComment, updateProp); //传入comment是为了判断类型
        this.getUserLikedAction(); //更新用户点赞列表
      }
    },
  },
});

export default useCommentStore;
