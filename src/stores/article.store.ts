import { acceptHMRUpdate, defineStore } from 'pinia';
import router from '@/router'; //拿到router对象,进行路由跳转(.push)
import { createArticle, getList, getDetail, updateArticle, removeArticle, getTags, getTagOrder, changeTags, getRecommend } from '@/service/article/article.request';
import { addImgForArticle, addVideoForArticle } from '@/service/file/file.request';
import { collectArticleMediaRefs, type ArticleStructuredContent } from '@/service/article/article.content';
import useUserStore from '@/stores/user.store';
import useEditorStore from './editor.store';
import { Msg, LocalCache } from '@/utils';
import { MAX_VIDEO_COUNT, VIDEO_COUNT_LIMIT_MESSAGE } from '@/components/tiptap-editor/uploadLimits';
import { mergeTagsByPreference, readGuestTagOrder } from '@/utils/tagOrderPreference';

import type { RouteParam } from '@/service/types';
import type { IArticles, IArticle, IArticleVideo, Itag } from '@/stores/types/article.result';

const dedupeNumberIds = (ids: number[]) => Array.from(new Set(ids));
const dedupeStringValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
const normalizeMediaUrl = (url?: string | null) => {
  if (!url) return '';
  return url.split('?')[0]?.trim() ?? '';
};
const resolveExistingVideoIdsByContent = (videoUrls: string[], articleVideos: IArticleVideo[] = []) => {
  const normalizedVideoUrls = new Set(videoUrls.map((url) => normalizeMediaUrl(url)).filter(Boolean));

  return dedupeNumberIds(
    articleVideos.map((video) => (normalizedVideoUrls.has(normalizeMediaUrl(video.url)) ? Number(video.id) : NaN)).filter((id) => Number.isInteger(id) && id > 0),
  );
};
const isVideoLimitExceeded = (count: number) => count > MAX_VIDEO_COUNT;
type ArticleMediaPayload = Array<{ isCover: boolean; id?: number; url?: string }>;
const buildArticleImagePayload = (imageRefs: ReturnType<typeof collectArticleMediaRefs>['images'], manualCoverImgId: number | null): ArticleMediaPayload => {
  const images: ArticleMediaPayload = [];

  if (manualCoverImgId) {
    images.push({ id: manualCoverImgId, isCover: true });
  }

  dedupeNumberIds(imageRefs.map((imageRef) => imageRef.imageId).filter((imageId): imageId is number => Number.isInteger(imageId) && imageId > 0)).forEach((id) => {
    images.push({ id, isCover: false });
  });

  dedupeStringValues(imageRefs.filter((imageRef) => !imageRef.imageId).map((imageRef) => imageRef.src ?? '')).forEach((url) => {
    images.push({ url, isCover: false });
  });

  return images;
};
interface IArticleDraftPayload {
  title: string;
  contentJson: ArticleStructuredContent;
  tags: string[];
  draftId?: number | null;
}

interface IArticleUpdatePayload extends IArticleDraftPayload {
  articleId: number;
}

const useArticleStore = defineStore('article', {
  state: () => ({
    articles: {} as IArticles,
    recommends: [] as IArticle[],
    recommendLoading: true,
    article: {} as IArticle,
    tags: [] as Itag[],
    activeTagId: '综合' as string | number, // 记忆导航栏激活的标签ID
    activeOrder: 'date' as string, // 记忆文章列表的排序方式
  }),
  getters: {
    isAuthor() {
      return (currentUserId?: number) => this.article.author?.id === currentUserId;
    },
    isArticleUserCollected() {
      return (articleId: number) => {
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
    /** 重置当前文章详情和文章列表（路由离开时清理） */
    initArticle() {
      this.article = {};
      this.articles = {};
    },
    /** 强制刷新第一页文章列表（发布/删除后调用） */
    refreshFirstPageAction(extraParams: Record<string, any> = {}) {
      return this.getArticleListAction({ ...extraParams, pageNum: 1, append: false });
    },
    // 异步请求action---------------------------------------------------
    /** 分页获取文章列表，支持追加模式（无限滚动）和覆盖模式 */
    async getArticleListAction(params: Record<string, any> = {}) {
      console.log('getArticleListAction params', params);
      const { userId = '', idList = [], keywords = '', append = false, loadingKey = '', pageNum = 1, pageSize = 10, pageOrder = 'date', tagId = '' } = params;
      // const offset = pageNum <= 1 ? 0 : (pageNum - 1) * pageSize;
      // const limit = pageSize;
      const paramsInfo = { pageNum, pageSize, tagId, pageOrder, userId, idList, keywords };
      console.log('getArticleListAction', paramsInfo);
      const res = await getList(paramsInfo, loadingKey); //获取文章列表信息以及文章数
      if (res.code === 0) {
        if (append) {
          // 追加文章列表
          const currentList = this.articles?.result ?? [];
          const nextList = res.data?.result ?? [];
          const merged = [...currentList, ...nextList];
          const dedup = Array.from(new Map(merged.map((it) => [it.id, it] as const)).values());
          this.articles = { result: dedup, total: res.data?.total ?? this.articles?.total } as IArticles;
        } else {
          // 更新文章列表
          this.articles = res.data;
          console.log('updateArticleList', this.articles.result);
        }
      } else {
        Msg.showFail('获取文章列表失败');
      }
    },
    /** 获取推荐文章列表（侧边栏展示） */
    async getRecommendAction(pageNum = 1, pageSize = 10) {
      this.recommendLoading = true;
      try {
        const res = await getRecommend({ pageNum, pageSize });
        res.code === 0 && (this.recommends = res.data);
      } finally {
        this.recommendLoading = false;
      }
    },
    /** 获取全部文章标签（导航栏标签列表） */
    async getTagsAction() {
      const userStore = useUserStore();
      const isAuthenticated = Boolean(userStore.userInfo.id);
      let res;

      try {
        res = isAuthenticated ? await getTagOrder() : await getTags();
      } catch {
        res = await getTags();
      }

      if (res.code === 0) {
        this.tags = isAuthenticated ? res.data : mergeTagsByPreference(res.data, readGuestTagOrder());
      }
    },
    /**
     * ======== 编辑页详情预填 ========
     * 1. 这个 action 只保留“读取详情并写入 store”这一层职责，供编辑页回填使用。
     * 2. 详情页的加载状态和副作用链路交给 useArticleDetail，避免 store 同时维护两套语义。
     */
    async getDetailAction(articleId?: RouteParam) {
      if (articleId == null || articleId === '') return false;

      try {
        const res = await getDetail(articleId);
        if (res.code === 0) {
          this.article = res.data;
          return true;
        }

        this.article = {};
        Msg.showFail('获取文章详情失败');
        return false;
      } catch {
        this.article = {};
        Msg.showFail('获取文章详情失败');
        return false;
      }
    },
    /** 发布新文章：创建文章 → 关联图片/视频/标签 → 清除草稿 → 跳转详情页 */
    async createAction(payload: IArticleDraftPayload) {
      const editorStore = useEditorStore();
      const { title, contentJson, tags, draftId } = payload;
      const mediaRefs = collectArticleMediaRefs(contentJson);
      const explicitVideoIds = dedupeNumberIds(
        mediaRefs.videos.map((videoRef) => videoRef.videoId).filter((videoId): videoId is number => Number.isInteger(videoId) && videoId > 0),
      );

      // 视频数量限制校验
      const nextVideoIds = dedupeNumberIds([...explicitVideoIds, ...editorStore.pendingVideoIds]);
      if (isVideoLimitExceeded(mediaRefs.videos.length) || isVideoLimitExceeded(nextVideoIds.length)) {
        Msg.showInfo(VIDEO_COUNT_LIMIT_MESSAGE);
        return false;
      }

      console.log('创建文章 createAction', { title, contentJson });
      const res = await createArticle({ title, contentJson, draftId });
      console.log('创建文章成功!!!!!!', res);
      if (res.code === -1) {
        Msg.showFail(`发布文章失败 ${res.msg}`);
        return false;
      } else if (res.code === 0) {
        const articleId = res.data.insertId;
        console.log('文章ID:', articleId);

        const images = buildArticleImagePayload(mediaRefs.images, editorStore.manualCoverImgId);
        console.log('从结构化正文中提取到的图片引用:', images);

        // 关联图片到文章
        if (images.length > 0) {
          editorStore.manualCoverImgId && console.log('使用手动上传的封面:', editorStore.manualCoverImgId);

          console.log('准备关联的图片:', images);
          const linkRes = await addImgForArticle(articleId, images);
          if (linkRes.code === 0) {
            console.log(`文章 ${articleId} 成功关联 ${images.length} 张图片`);
          } else {
            console.error(`文章 ${articleId} 图片关联失败:`, linkRes);
          }
        } else {
          console.log('没有图片需要关联');
        }

        // 关联视频到文章
        console.log('从结构化正文中提取到的视频:', mediaRefs.videos);

        if (mediaRefs.videos.length > 0 || explicitVideoIds.length > 0 || editorStore.pendingVideoIds.length > 0) {
          const videoIds = nextVideoIds;
          console.log(`文章 ${articleId} 已创建,要为该文章添加以下视频id:`, videoIds);

          if (videoIds.length > 0) {
            const res = await addVideoForArticle(articleId, videoIds);
            if (res.code === 0) {
              console.log(`文章 ${articleId} 成功添加 ${videoIds.length} 个视频`);
            } else {
              console.error('关联视频失败:', res);
              Msg.showFail('视频关联失败: ' + (res.msg || '未知错误'));
            }
          }
        } else {
          console.log('没有视频需要关联');
        }

        if (tags.length) {
          const res = await changeTags(articleId, tags);
          res.code === 0 && Msg.showSuccess('标签保存成功');
        }

        // 清除本地兜底草稿
        LocalCache.removeCache('draft');
        console.log('已清除本地兜底草稿');

        // 清空所有待清理的文件（封面、图片、视频）
        editorStore.clearPendingFiles();

        Msg.showSuccess('发布文章成功');
        router.replace(`/article/${articleId}`);
        return true;
      } else {
        Msg.showFail('发布文章失败');
        return false;
      }
    },
    /** 更新已有文章：修改标签 → 修改内容 → 重新关联图片/视频 → 返回上一页 */
    async updateAction(payload: IArticleUpdatePayload) {
      const editorStore = useEditorStore();
      console.log('修改文章 updateAction', payload);
      const { articleId, title, contentJson, tags, draftId } = payload;
      const mediaRefs = collectArticleMediaRefs(contentJson);

      // 视频数量限制校验
      const explicitVideoIds = dedupeNumberIds(
        mediaRefs.videos.map((videoRef) => videoRef.videoId).filter((videoId): videoId is number => Number.isInteger(videoId) && videoId > 0),
      );
      const legacyVideoUrls = dedupeStringValues(mediaRefs.videos.filter((videoRef) => !videoRef.videoId).map((videoRef) => videoRef.src ?? ''));
      const existingVideoIds = resolveExistingVideoIdsByContent(legacyVideoUrls, this.article.videos ?? []);
      const nextVideoIds = dedupeNumberIds([...explicitVideoIds, ...existingVideoIds, ...editorStore.pendingVideoIds]);
      if (isVideoLimitExceeded(mediaRefs.videos.length) || isVideoLimitExceeded(nextVideoIds.length)) {
        Msg.showInfo(VIDEO_COUNT_LIMIT_MESSAGE);
        return false;
      }

      // 修改标签（统一处理，无需对比）
      console.log('修改文章 updateAction tags=================', tags);
      const res1 = await changeTags(String(articleId), tags);
      res1.code === 0 && Msg.showSuccess('标签保存成功');

      // 修改文章内容
      const res2 = await updateArticle({ articleId, title, contentJson, draftId });
      if (res2.code === 0) {
        const images = buildArticleImagePayload(mediaRefs.images, editorStore.manualCoverImgId);
        console.log('修改后结构化正文中的图片引用:', images);

        editorStore.manualCoverImgId && console.log('使用手动上传的新封面:', editorStore.manualCoverImgId);

        console.log('准备更新关联的图片:', images);
        const linkRes = await addImgForArticle(articleId, images);
        linkRes.code === 0 && console.log(`文章 ${articleId} 成功更新图片关联`);

        // 关联视频到文章（包括新增和删除）
        console.log('修改后结构化正文中的视频:', mediaRefs.videos);

        const videoIds = nextVideoIds;
        console.log(`articleId为${articleId}的文章已修改,要为该文章添加以下视频id:`, videoIds);

        const res = await addVideoForArticle(articleId, videoIds);
        if (res.code === 0) {
          console.log(`id为${articleId}的文章成功同步${videoIds.length}个视频`);
        } else {
          console.error('关联视频失败:', res);
          Msg.showFail('视频关联失败: ' + (res.msg || '未知错误'));
        }

        LocalCache.removeCache('draft');

        // 清空所有待清理的文件（封面、图片、视频）
        editorStore.clearPendingFiles();

        Msg.showSuccess('修改文章成功');
        if (window.history.state?.back) {
          console.log('使用router.back()', window.history.state);
          router.back();
        } else {
          console.log('使用router.replace()');
          // 兜底方案：如果用户直接通过 url 进入编辑页，没有上一个历史记录时，直接 replace 到详情页
          router.replace({ path: `/article/${articleId}` });
        }
        return true;
      } else {
        Msg.showFail('修改文章失败');
        console.log(res2);
        return false;
      }
    },
    /** 删除指定文章并跳转回文章列表页 */
    async removeAction(articleId: RouteParam) {
      const res = await removeArticle(articleId);
      if (res.code === 0) {
        Msg.showSuccess('删除文章成功');
        router.push({ path: `/article` });
      } else {
        Msg.showFail('删除文章失败');
      }
    },
    // async searchAction(keywords, loadingKey) {
    //   const res = await search(keywords, loadingKey);
    //   if (res.code === 0) {
    //     this.searchResults = res.data;
    //     console.log('updateSearchResults', this.searchResults);
    //   }
    // },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useArticleStore, import.meta.hot));
}

export default useArticleStore;
