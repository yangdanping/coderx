import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转(.push)
import { createArticle, getList, getDetail, likeArticle, updateArticle, removeArticle, addView, getTags, changeTags, search } from '@/service/article/article.request';
import { getLiked } from '@/service/user/user.request';
import { addPictureForArticle } from '@/service/file/file.request';
import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useCommentStore from './comment';
import { Msg, timeFormat, isArrEqual } from '@/utils';

import type { RouteParam } from '@/service/types';
import type { IArticles, IArticle, Itag } from '@/stores/types/article.result';

export const useArticleStore = defineStore('article', {
  state: () => ({
    articles: {} as IArticles,
    article: {} as IArticle,
    articleLikedId: [] as any[], //该用户点赞过的文章id,通过computed计算是否有点赞
    tags: [] as Itag[],
    searchResults: [] as any[],
    uploaded: [] as any[]
  }),
  getters: {
    isAuthor() {
      return (userId?: number) => (this.article.author ? this.article.author.id === userId : false);
    },
    isArticleUserLiked() {
      return (articleId) => {
        return { liked: this.articleLikedId.some((id) => id === articleId) };
      };
    }
  },
  actions: {
    getListMutation(articles: IArticles) {
      articles.result?.forEach((article) => {
        article.createAt = timeFormat(article.createAt);
        article.updateAt = timeFormat(article.updateAt);
      });
      this.articles = articles;
      console.log('getListMutation', this.articles);
    },
    changeUploaded(imgId: number) {
      if (imgId) {
        this.uploaded.push(imgId);
      } else {
        this.uploaded = [];
        console.log('changeUploaded已清0!!!!!!!!!!!!!!!!');
      }
    },
    getDetail(article: IArticle) {
      article.createAt = timeFormat(article.createAt);
      article.updateAt = timeFormat(article.updateAt);
      this.article = article;
    },
    getArticleLikedId(articleLiked) {
      this.articleLikedId = articleLiked;
    },
    initArticle() {
      this.article = {};
    },
    initTag(tags: Itag[]) {
      this.tags = tags;
    },
    // 异步请求action---------------------------------------------------
    async getListAction() {
      const { pageNum, pageSize, tagId } = useRootStore();
      const { userInfo } = useUserStore();
      const data = { pageNum, pageSize, tagId };
      console.log('getListAction', data);
      const res = await getList(data); //获取文章列表信息以及文章数
      console.log('getListAction res', res);
      if (res.code === 0) {
        this.getListMutation(res.data);
        userInfo.id && this.refreshLikeAction(); //若用户登录获取登录用户点赞过哪些文章
      } else {
        Msg.showFail('获取文章列表失败');
      }
    },
    async refreshLikeAction() {
      const { userInfo } = useUserStore();
      const res = await getLiked(userInfo.id);
      console.log('refreshLikeAction', res);
      res.code === 0 && this.getArticleLikedId(res.data.articleLiked);
    },
    async editAction(payload) {
      const { title, content, tags } = payload;
      console.log('editAction createArticle', { title, content });
      const res = await createArticle({ title, content });
      console.log('创建文章成功!!!!!!', res);
      if (res.code === -1) {
        Msg.showFail(`发布文章失败 ${res.msg}`);
      } else if (res.code === 0) {
        const articleId = res.data.insertId;
        if (this.uploaded.length) {
          console.log(`articleId为${articleId}的文章已创建,要为该文章添加以下图片id`, this.uploaded);
          const res = await addPictureForArticle(articleId, this.uploaded);
          res.code === 0 && console.log(`id为${articleId}的文章成功添加${res.data.affectedRows}张图片`);
          this.changeUploaded(0);
        }
        if (tags.length) {
          const res = await changeTags(articleId, tags);
          res.code === 0 && Msg.showSuccess('添加标签成功');
        }
        router.replace(`/article/${articleId}`);
        Msg.showSuccess('发布文章成功');
      } else {
        Msg.showFail('发布文章失败');
      }
    },
    async getDetailAction(articleId?: RouteParam) {
      const res1 = await addView(articleId);
      if (res1.code === 0) {
        console.log('已增加浏览量,准备获取文章详情信息', articleId);
        const res2 = await getDetail(articleId);
        if (res2.code === 0) {
          this.getDetail(res2.data);
          // 获取内容后再获取文章评论
          useCommentStore().getCommentAction(articleId);
        } else {
          Msg.showFail('获取文章详情失败');
        }
      } else {
        Msg.showFail('浏览量增加失败');
      }
    },
    async getTagsAction() {
      const res = await getTags();
      res.code === 0 && this.initTag(res.data);
      console.log('getTagsAction');
    },
    async likeAction(articleId) {
      const res = await likeArticle(articleId);
      console.log('likeAction!!!!', res);
      if (res.code === -1) {
        Msg.showFail(`点赞失败 ${res.msg}`);
      } else if (res.code === 0) {
        this.getListAction();
        Msg.showSuccess('已点赞文章');
      } else {
        this.getListAction();
        Msg.showInfo('已取消点赞文章');
      }
    },
    async updateAction(payload) {
      console.log('我要修改文章!!!!!!!!!!!!!', payload);
      const { articleId, title, content, oldTags, tags } = payload;
      if (!isArrEqual(oldTags, tags)) {
        console.log('新旧tags不相同,要修改');
        const res = await changeTags(articleId, tags, true);
        res.code === 0 && Msg.showSuccess('修改标签成功');
      } else {
        console.log('新旧tags相同,不修改');
      }
      const res = await updateArticle({ articleId, title, content });
      if (res.code === 0) {
        //若新增了图片
        if (this.uploaded.length) {
          console.log(`articleId为${articleId}的文章已创建,要为该文章添加以下图片id`, this.uploaded);
          const res = await addPictureForArticle(articleId, this.uploaded);
          res.code === 0 && console.log(`id为${articleId}的文章成功添加${res.data.affectedRows}张图片`);
          this.changeUploaded(0);
        }
        Msg.showSuccess('修改文章成功');
        router.push({ path: `/article/${articleId}` });
      } else {
        Msg.showFail('修改文章失败');
        console.log(res);
      }
    },
    async removeAction(articleId) {
      const res = await removeArticle(articleId);
      if (res.code === 0) {
        Msg.showSuccess('删除文章成功');
        this.articles.result?.length ? router.push({ path: `/article` }) : router.go(0);
      } else {
        Msg.showFail('删除文章失败');
      }
    }
  }
});

export default useArticleStore;
