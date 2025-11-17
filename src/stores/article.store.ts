import { defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转(.push)
import {
  createArticle,
  getList,
  getDetail,
  likeArticle,
  updateArticle,
  removeArticle,
  addView,
  getTags,
  changeTags,
  search,
  getRecommend,
  getArticleLikedById,
} from '@/service/article/article.request';
import { getLiked } from '@/service/user/user.request';
import { addImgForArticle, uploadImg, deleteImg, addVideoForArticle } from '@/service/file/file.request';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useCommentStore from './comment.store';
import { Msg, isArrEqual, isEmptyObj, extractImagesFromHtml, LocalCache } from '@/utils';

import type { RouteParam } from '@/service/types';
import type { IArticles, IArticle, Itag } from '@/stores/types/article.result';
const useArticleStore = defineStore('article', {
  state: () => ({
    articles: {} as IArticles,
    recommends: [] as any[],
    article: {} as IArticle,
    userLikedArticleIdList: [] as any[], //该用户点赞过的文章id,通过computed计算是否有点赞
    tags: [] as Itag[],
    searchResults: [] as any[],
    manualCoverImgId: null as number | null, // 手动上传的封面图片ID
    pendingImageIds: [] as number[], // 待清理的图片ID（用于刷新页面时清理孤儿图片）
    uploadedVideos: [] as number[], // 上传的视频ID数组
  }),
  getters: {
    isAuthor() {
      return (userId?: number) => (this.article.author ? this.article.author.id === userId : false);
    },
    isArticleUserLiked() {
      return (articleId) => {
        return this.userLikedArticleIdList.some((id) => id === articleId);
      };
    },
    isArticleUserCollected() {
      return (articleId) => {
        const userCollect = useUserStore().collects;
        return userCollect
          .map((item) => item.count)
          .flat()
          .some((id) => id === articleId);
      };
    },
    hasMore(): boolean {
      const total = this.articles.total ?? 0;
      const listLength = this.articles.result?.length ?? 0;
      return listLength < total;
      // const size = useRootStore().pageSize;
      // return loaded > 0 && loaded % size === 0;
    },
  },
  actions: {
    updateArticleList(articles: IArticles) {
      this.articles = articles;
      console.log('updateArticleList', this.articles.result);
    },
    appendArticleList(articles: IArticles) {
      const currentList = this.articles?.result ?? [];
      const nextList = articles?.result ?? [];
      const merged = [...currentList, ...nextList];
      const dedup = Array.from(new Map(merged.map((it: any) => [it.id, it])).values());
      this.articles = { result: dedup, total: articles?.total ?? this.articles?.total } as IArticles;
    },
    updateDetail(article: IArticle, isEditRefresh = false) {
      this.article = article;
    },
    setManualCoverImgId(imgId: number | null) {
      this.manualCoverImgId = imgId;
      console.log('设置手动封面ID:', imgId);
    },
    addPendingImageId(imgId: number) {
      this.pendingImageIds.push(imgId);
      console.log('添加待清理图片ID:', imgId, '当前列表:', this.pendingImageIds);
    },
    clearPendingImageIds() {
      this.pendingImageIds = [];
      console.log('清空待清理图片ID列表');
    },
    updateUploadedVideos(videoId?: number) {
      if (videoId) {
        this.uploadedVideos.push(videoId);
        console.log('添加视频ID到uploadedVideos:', videoId, this.uploadedVideos);
      } else {
        this.uploadedVideos.length && (this.uploadedVideos = []);
        console.log('updateUploadedVideos已清0!!!!!!!!!!!!!!!!');
      }
    },
    updateUserLikedId(userLikedArticleIdList) {
      this.userLikedArticleIdList = userLikedArticleIdList;
    },
    updateArticleLikes(articleId, likes) {
      // 更改列表中的likes
      this.articles.result?.find((article) => {
        if (article.id === articleId) {
          article.likes = likes;
        }
      });
      if (isEmptyObj(this.article)) {
        this.article.likes = likes;
      }
    },
    updateSearchResults(searchResults) {
      this.searchResults = searchResults;
      console.log('updateSearchResults', this.searchResults);
    },
    updateTag(tags: Itag[]) {
      this.tags = tags;
    },
    initArticle() {
      this.article = {};
      this.articles = {};
    },
    loadMoreAction(extraParams: Record<string, any> = {}) {
      const rootStore = useRootStore();
      rootStore.changePageNum(rootStore.pageNum + 1);
      return this.getArticleListAction({ ...extraParams, append: true });
    },
    refreshFirstPageAction(extraParams: Record<string, any> = {}) {
      const rootStore = useRootStore();
      rootStore.changePageNum(1);
      return this.getArticleListAction({ ...extraParams, append: false });
    },
    // 异步请求action---------------------------------------------------
    // async getArticleListAction(userId: number | '' = '', idList = [], keywords = '', append = false, loadingKey?: string) {
    async getArticleListAction(params: Record<string, any> = {}) {
      console.log('getArticleListAction params', params);
      const { userId = '', idList = [], keywords = '', append = false, loadingKey = '' } = params;
      const { pageNum, pageSize, pageOrder, tagId } = useRootStore();
      const offset = pageNum <= 1 ? 0 : (pageNum - 1) * pageSize;
      const limit = pageSize;
      const paramsInfo = { offset, limit, tagId, pageOrder, userId, idList, keywords };
      console.log('getArticleListAction', paramsInfo);
      const res = await getList(paramsInfo, loadingKey); //获取文章列表信息以及文章数
      if (res.code === 0) {
        append ? this.appendArticleList(res.data) : this.updateArticleList(res.data);
        useUserStore().userInfo.id && this.getUserLikedAction(); //获取已登录用户点赞过哪些文章
      } else {
        Msg.showFail('获取文章列表失败');
      }
    },
    async getRecommendAction(offset = 0, limit = 10) {
      const res = await getRecommend({ offset, limit });
      res.code === 0 && (this.recommends = res.data);
      console.log('getRecommendAction res', this.recommends);
    },
    async getDetailAction(articleId?: RouteParam, isEditRefresh = false) {
      if (!isEditRefresh) {
        await addView(articleId); //新增浏览量
        this.getUserLikedAction(); //获取点赞信息
      }
      const res = await getDetail(articleId);
      if (res.code === 0) {
        const userStore = useUserStore();
        const { userInfo } = userStore;
        await userStore.getCollectAction(userInfo.id); //请求收藏夹
        const article: IArticle = res.data;
        this.updateDetail(article, isEditRefresh);
        // 确认文章有评论 且 非编辑时刷新的情况下,才去获取文章评论
        article.commentCount && !isEditRefresh && useCommentStore().getCommentAction(articleId as any);
      } else {
        Msg.showFail('获取文章详情失败');
      }
    },
    async getTagsAction() {
      const res = await getTags();
      res.code === 0 && this.updateTag(res.data);
      console.log('getTagsAction');
    },
    async getUserLikedAction() {
      const { userInfo } = useUserStore();
      const res = await getLiked(userInfo.id); //获取当前用户的对所有文章的点赞信息
      console.log('getUserLikedAction', res);
      res.code === 0 && this.updateUserLikedId(res.data.articleLiked);
    },
    async createAction(payload) {
      const { title, content, tags } = payload;
      console.log('创建文章 createAction', { title, content });
      const res = await createArticle({ title, content });
      console.log('创建文章成功!!!!!!', res);
      if (res.code === -1) {
        Msg.showFail(`发布文章失败 ${res.msg}`);
      } else if (res.code === 0) {
        const articleId = res.data.insertId;
        console.log('文章ID:', articleId);

        // 从HTML内容中提取图片URL
        const imageUrls = extractImagesFromHtml(content);
        console.log('从内容中提取到的图片:', imageUrls);

        // 关联图片到文章
        if (imageUrls.length > 0 || this.manualCoverImgId) {
          const images: any = [];

          // 如果有手动上传的封面，作为第一张（封面）
          if (this.manualCoverImgId) {
            images.push({ id: this.manualCoverImgId, isCover: true });
            console.log('使用手动上传的封面:', this.manualCoverImgId);
          } else if (imageUrls.length > 0) {
            // 否则使用第一张图片作为封面
            images.push({ url: imageUrls[0], isCover: true });
            console.log('使用第一张图片作为封面:', imageUrls[0]);
          }

          // 添加其他图片
          for (let i = this.manualCoverImgId ? 0 : 1; i < imageUrls.length; i++) {
            images.push({ url: imageUrls[i], isCover: false });
          }

          console.log('准备关联的图片:', images);
          const linkRes = await addImgForArticle(articleId, images);
          if (linkRes.code === 0) {
            console.log(`文章 ${articleId} 成功关联 ${images.length} 张图片`);
          } else {
            console.error(`文章 ${articleId} 图片关联失败:`, linkRes);
          }

          // 清空手动封面ID
          this.setManualCoverImgId(null);
        } else {
          console.log('没有图片需要关联');
        }

        // 清空待清理图片列表（文章已保存）
        this.clearPendingImageIds();

        // 关联视频到文章
        // if (this.uploadedVideos.length) {
        //   console.log(`文章 ${articleId} 已创建,要为该文章添加以下视频id:`, this.uploadedVideos);
        //   const res = await addVideoForArticle(articleId, this.uploadedVideos);
        //   if (res.code === 0) {
        //     console.log(`文章 ${articleId} 成功添加 ${this.uploadedVideos.length} 个视频`);
        //     Msg.showSuccess('视频关联成功');
        //   } else {
        //     console.error('关联视频失败:', res);
        //     Msg.showFail('视频关联失败: ' + (res.msg || '未知错误'));
        //   }
        //   this.updateUploadedVideos(0); // 清空视频ID数组
        // }

        if (tags.length) {
          const res = await changeTags(articleId, tags);
          res.code === 0 && Msg.showSuccess('添加标签成功');
        }

        // 清除草稿
        LocalCache.removeCache('draft');
        console.log('已清除草稿');

        router.replace(`/article/${articleId}`);
        Msg.showSuccess('发布文章成功');
      } else {
        Msg.showFail('发布文章失败');
      }
    },
    async likeAction(articleId) {
      const res1 = await likeArticle(articleId);
      console.log('likeAction!!!!', res1);
      res1.code === 0 ? Msg.showSuccess('已点赞文章') : Msg.showInfo('已取消点赞文章');
      const res2 = await getArticleLikedById(articleId); //更新文章点赞
      if (res2.code === 0) {
        this.updateArticleLikes(articleId, res2.data.likes);
        this.getUserLikedAction(); //更新用户点赞列表
      }
    },
    async updateAction(payload) {
      console.log('修改文章 updateAction', payload);
      const { articleId, title, content, oldTags, tags } = payload;

      // 修改标签
      if (!isArrEqual(oldTags, tags)) {
        console.log('标签有变化，需要修改');
        const res = await changeTags(articleId, tags, true);
        res.code === 0 && Msg.showSuccess('修改标签成功');
      }

      // 修改文章内容
      const res = await updateArticle({ articleId, title, content });
      if (res.code === 0) {
        // 从HTML内容中提取新图片
        const imageUrls = extractImagesFromHtml(content);
        console.log('修改后内容中的图片:', imageUrls);

        // 如果有新的图片或手动封面，需要更新关联
        if (imageUrls.length > 0 || this.manualCoverImgId) {
          const images: any = [];

          // 获取原文章的封面信息（从images数组中找到带-cover后缀的图片）
          const originalCoverImage: any = this.article.images?.find((img) => img.url?.includes('-cover'));
          let originalCoverUrl = null;
          if (originalCoverImage) {
            // 移除URL中的查询参数和-cover后缀，得到原始URL
            originalCoverUrl = originalCoverImage.url.split('?')[0].replace('-cover', '');
            console.log('原封面URL:', originalCoverUrl);
          }

          // 封面优先级：手动上传 > 保留原封面 > 第一张图片
          if (this.manualCoverImgId) {
            // 优先级1：使用手动上传的新封面
            images.push({ id: this.manualCoverImgId, isCover: true });
            console.log('优先级1 - 使用手动上传的新封面:', this.manualCoverImgId);
          } else if (originalCoverUrl && imageUrls.some((url) => url.includes(originalCoverUrl))) {
            // 优先级2：如果原封面仍在内容中，保留原封面
            images.push({ url: originalCoverUrl, isCover: true });
            console.log('优先级2 - 保留原封面:', originalCoverUrl);
          } else if (imageUrls.length > 0) {
            // 优先级3：使用第一张图片作为封面
            images.push({ url: imageUrls[0], isCover: true });
            console.log('优先级3 - 使用第一张图片作为封面:', imageUrls[0]);
          }

          // 添加其他图片（避免重复添加封面）
          const coverUrl = images[0]?.url || null;
          const coverId = images[0]?.id || null;

          for (let i = 0; i < imageUrls.length; i++) {
            const currentUrl = imageUrls[i];
            // 跳过已经作为封面的图片（URL匹配）
            if (coverUrl && currentUrl.includes(coverUrl)) {
              continue;
            }
            // 如果手动上传的封面也在内容中，跳过（ID匹配）
            // 这种情况较少，但为了严谨性还是处理一下
            images.push({ url: currentUrl, isCover: false });
          }

          console.log('准备更新关联的图片:', images);
          const linkRes = await addImgForArticle(articleId, images);
          linkRes.code === 0 && console.log(`文章 ${articleId} 成功更新图片关联`);

          // 清空手动封面ID
          this.setManualCoverImgId(null);
        }

        // 清空待清理图片列表（文章已保存）
        this.clearPendingImageIds();

        // 若新增了视频
        // if (this.uploadedVideos.length) {
        //   console.log(`articleId为${articleId}的文章已修改,要为该文章添加以下视频id`, this.uploadedVideos);
        //   const res = await addVideoForArticle(articleId, this.uploadedVideos);
        //   if (res.code === 0) {
        //     console.log(`id为${articleId}的文章成功添加${this.uploadedVideos.length}个视频`);
        //     Msg.showSuccess('视频关联成功');
        //   }
        //   this.updateUploadedVideos(0); // 清空视频ID数组
        // }

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
        router.push({ path: `/article` });
      } else {
        Msg.showFail('删除文章失败');
      }
    },
    // 手动上传封面
    async uploadCoverAction(file: File) {
      const res = await uploadImg(file);
      if (res.code === 0) {
        const url = res.data[0].url;
        const imgId = res.data[0].result.insertId;
        console.log('手动上传封面成功:', url, imgId);
        this.setManualCoverImgId(imgId);
        this.addPendingImageId(imgId); // 添加到待清理列表
        return Promise.resolve(url.concat('?type=small'));
      } else {
        Msg.showFail('封面上传失败');
      }
    },
    // 清理孤儿图片
    async deletePendingImagesAction() {
      if (this.pendingImageIds.length) {
        const imagesToDelete = this.pendingImageIds.map((id) => ({ id }));
        console.log('清理孤儿图片:', imagesToDelete);
        const res = await deleteImg(imagesToDelete);
        if (res.code === 0) {
          this.clearPendingImageIds();
          console.log('孤儿图片清理成功');
        } else {
          console.error('孤儿图片清理失败');
        }
      } else {
        console.log('没有需要清理的孤儿图片');
      }
    },
    async searchAction(keywords, loadingKey) {
      const res = await search(keywords, loadingKey);
      if (res.code === 0) {
        this.updateSearchResults(res.data);
      }
    },
  },
});

export default useArticleStore;
