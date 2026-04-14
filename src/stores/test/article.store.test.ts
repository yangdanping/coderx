import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const {
  createArticle,
  addImgForArticle,
  addVideoForArticle,
  changeTags,
  updateArticle,
  deleteDraftRequest,
  routerReplace,
  routerBack,
  clearPendingFiles,
  editorStoreState,
  removeCache,
  showInfo,
  extractImagesFromHtmlMock,
  extractVideosFromHtmlMock,
  extractVideoIdsFromHtmlMock,
  extractVideoReferencesFromHtmlMock,
} = vi.hoisted(() => {
  const clearPendingFiles = vi.fn();
  const showInfo = vi.fn();

  return {
    createArticle: vi.fn(),
    addImgForArticle: vi.fn(),
    addVideoForArticle: vi.fn(),
    changeTags: vi.fn(),
    updateArticle: vi.fn(),
    deleteDraftRequest: vi.fn(),
    routerReplace: vi.fn(),
    routerBack: vi.fn(),
    clearPendingFiles,
    removeCache: vi.fn(),
    editorStoreState: {
      manualCoverImgId: null as number | null,
      pendingImageIds: [] as number[],
      pendingVideoIds: [] as number[],
      clearPendingFiles,
    },
    showInfo,
    extractImagesFromHtmlMock: vi.fn(),
    extractVideosFromHtmlMock: vi.fn(),
    extractVideoIdsFromHtmlMock: vi.fn(),
    extractVideoReferencesFromHtmlMock: vi.fn(),
  };
});

vi.mock('@/service/article/article.request', () => ({
  createArticle,
  getList: vi.fn(),
  likeArticle: vi.fn(),
  updateArticle,
  removeArticle: vi.fn(),
  getTags: vi.fn(),
  changeTags,
  getRecommend: vi.fn(),
}));

vi.mock('@/service/file/file.request', () => ({
  addImgForArticle,
  addVideoForArticle,
}));

vi.mock('@/service/draft/draft.request', () => ({
  deleteDraftRequest,
}));

vi.mock('@/service/user/user.request', () => ({
  getLiked: vi.fn(),
}));

vi.mock('@/stores/user.store', () => ({
  default: () => ({
    userInfo: {},
    collects: [],
  }),
}));

vi.mock('../history.store', () => ({
  default: () => ({}),
}));

vi.mock('../editor.store', () => ({
  default: () => editorStoreState,
}));

vi.mock('@/router', () => ({
  default: {
    replace: routerReplace,
    back: routerBack,
    push: vi.fn(),
  },
}));

vi.mock('@/utils', () => ({
  Msg: {
    showInfo,
    showSuccess: vi.fn(),
    showFail: vi.fn(),
  },
  extractImagesFromHtml: extractImagesFromHtmlMock,
  extractVideosFromHtml: extractVideosFromHtmlMock,
  extractVideoIdsFromHtml: extractVideoIdsFromHtmlMock,
  extractVideoReferencesFromHtml: extractVideoReferencesFromHtmlMock,
  LocalCache: {
    removeCache,
  },
}));

import useArticleStore from '../article.store';

describe('article.store updateAction', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    createArticle.mockReset();
    addImgForArticle.mockReset();
    addVideoForArticle.mockReset();
    changeTags.mockReset();
    updateArticle.mockReset();
    deleteDraftRequest.mockReset();
    routerReplace.mockReset();
    routerBack.mockReset();
    clearPendingFiles.mockReset();
    removeCache.mockReset();
    showInfo.mockReset();
    extractImagesFromHtmlMock.mockReset();
    extractVideosFromHtmlMock.mockReset();
    extractVideoIdsFromHtmlMock.mockReset();
    extractVideoReferencesFromHtmlMock.mockReset();

    editorStoreState.manualCoverImgId = null;
    editorStoreState.pendingImageIds = [];
    editorStoreState.pendingVideoIds = [];

    createArticle.mockResolvedValue({ code: 0, data: { insertId: 42 } });
    changeTags.mockResolvedValue({ code: 0 });
    updateArticle.mockResolvedValue({ code: 0 });
    addImgForArticle.mockResolvedValue({ code: 0 });
    addVideoForArticle.mockResolvedValue({ code: 0 });
    deleteDraftRequest.mockResolvedValue({ code: 0 });
    extractImagesFromHtmlMock.mockReturnValue([]);
    extractVideosFromHtmlMock.mockReturnValue([]);
    extractVideoIdsFromHtmlMock.mockReturnValue([]);
    extractVideoReferencesFromHtmlMock.mockReturnValue([]);
  });

  it('passes draftId to createArticle and keeps local cleanup without deleting the draft again', async () => {
    const store = useArticleStore();

    await store.createAction({
      title: '新文章',
      content: '<p>发布正文</p>',
      tags: [],
      draftId: 7,
    });

    expect(createArticle).toHaveBeenCalledWith({
      title: '新文章',
      content: '<p>发布正文</p>',
      draftId: 7,
    });
    expect(deleteDraftRequest).not.toHaveBeenCalled();
    expect(removeCache).toHaveBeenCalledWith('draft');
    expect(clearPendingFiles).toHaveBeenCalledTimes(1);
  });

  it('does not mark the first body image as cover when creating without a manual cover', async () => {
    const store = useArticleStore();
    extractImagesFromHtmlMock.mockReturnValue([
      'https://api.example/article/images/body-1.jpg',
      'https://api.example/article/images/body-2.jpg',
    ]);

    await store.createAction({
      title: '新文章',
      content: '<p>带两张正文图</p>',
      tags: [],
      draftId: 7,
    });

    expect(addImgForArticle).toHaveBeenCalledWith(42, [
      { url: 'https://api.example/article/images/body-1.jpg', isCover: false },
      { url: 'https://api.example/article/images/body-2.jpg', isCover: false },
    ]);
  });

  it('passes draftId to updateArticle and keeps local cleanup without deleting the draft again', async () => {
    const store = useArticleStore();
    store.article = {
      id: 42,
      title: '已有文章',
      content: '<p>old</p>',
      images: [],
      videos: [],
      tags: [],
    };

    await store.updateAction({
      articleId: 42,
      title: '更新后',
      content: '<p>更新正文</p>',
      tags: [],
      draftId: 7,
    });

    expect(updateArticle).toHaveBeenCalledWith({
      articleId: 42,
      title: '更新后',
      content: '<p>更新正文</p>',
      draftId: 7,
    });
    expect(deleteDraftRequest).not.toHaveBeenCalled();
    expect(removeCache).toHaveBeenCalledWith('draft');
    expect(clearPendingFiles).toHaveBeenCalledTimes(1);
  });

  it('syncs empty media arrays when an edited article no longer references any images or videos', async () => {
    const store = useArticleStore();
    store.article = {
      id: 42,
      title: '已有文章',
      content: '<p>old</p>',
      images: [{ id: 11, url: 'https://api.example/article/images/old.jpg' }],
      videos: [{ id: 21, url: 'https://api.example/article/video/old.mp4' }],
      tags: [],
    };

    await store.updateAction({
      articleId: 42,
      title: '更新后',
      content: '<p>纯文本，无媒体</p>',
      tags: [],
      draftId: 7,
    });

    expect(addImgForArticle).toHaveBeenCalledWith(42, []);
    expect(addVideoForArticle).toHaveBeenCalledWith(42, []);
  });

  it('does not preserve or infer a cover when updating without a manual cover', async () => {
    const store = useArticleStore();
    store.article = {
      id: 42,
      title: '已有文章',
      content: '<p>old</p>',
      images: [{ id: 11, url: 'https://api.example/article/images/body-1.jpg-cover?type=small' }],
      videos: [],
      tags: [],
    };
    extractImagesFromHtmlMock.mockReturnValue([
      'https://api.example/article/images/body-1.jpg',
      'https://api.example/article/images/body-2.jpg',
    ]);

    await store.updateAction({
      articleId: 42,
      title: '更新后',
      content: '<p>正文里仍有两张图</p>',
      tags: [],
      draftId: 7,
    });

    expect(addImgForArticle).toHaveBeenCalledWith(42, [
      { url: 'https://api.example/article/images/body-1.jpg', isCover: false },
      { url: 'https://api.example/article/images/body-2.jpg', isCover: false },
    ]);
  });

  it('prefers explicit video ids from html over legacy url matching when syncing edited articles', async () => {
    const store = useArticleStore();
    store.article = {
      id: 42,
      title: '已有文章',
      content: '<p>old</p>',
      images: [],
      videos: [
        { id: 21, url: 'https://api.example/article/video/keep.mp4' },
        { id: 22, url: 'https://api.example/article/video/removed.mp4' },
      ],
      tags: [],
    };
    editorStoreState.pendingVideoIds = [99];
    extractVideosFromHtmlMock.mockReturnValue(['https://api.example/article/video/removed.mp4']);
    extractVideoIdsFromHtmlMock.mockReturnValue([88]);
    extractVideoReferencesFromHtmlMock.mockReturnValue([
      {
        rawTag: '<video data-video-id="88" src="https://api.example/article/video/removed.mp4"></video>',
        videoId: 88,
        src: 'https://api.example/article/video/removed.mp4',
      },
    ]);

    await store.updateAction({
      articleId: 42,
      title: '更新后',
      content: '<video data-video-id="88" src="https://api.example/article/video/removed.mp4"></video>',
      tags: [],
      draftId: 7,
    });

    expect(addVideoForArticle).toHaveBeenCalledWith(42, [88, 99]);
  });

  it('falls back to legacy url matching when html does not include explicit video ids', async () => {
    const store = useArticleStore();
    store.article = {
      id: 42,
      title: '已有文章',
      content: '<p>old</p>',
      images: [],
      videos: [{ id: 21, url: 'https://api.example/article/video/keep.mp4' }],
      tags: [],
    };
    extractVideosFromHtmlMock.mockReturnValue(['https://api.example/article/video/keep.mp4']);
    extractVideoIdsFromHtmlMock.mockReturnValue([]);
    extractVideoReferencesFromHtmlMock.mockReturnValue([
      {
        rawTag: '<video src="https://api.example/article/video/keep.mp4"></video>',
        videoId: null,
        src: 'https://api.example/article/video/keep.mp4',
      },
    ]);

    await store.updateAction({
      articleId: 42,
      title: '更新后',
      content: '<video src="https://api.example/article/video/keep.mp4"></video>',
      tags: [],
      draftId: 7,
    });

    expect(addVideoForArticle).toHaveBeenCalledWith(42, [21]);
  });

  it('blocks createAction before creating the article when deduped video ids exceed the limit', async () => {
    const store = useArticleStore();
    editorStoreState.pendingVideoIds = [3];
    extractVideosFromHtmlMock.mockReturnValue([]);
    extractVideoIdsFromHtmlMock.mockReturnValue([1, 2]);

    const result = await store.createAction({
      title: '新文章',
      content: '<p>正文</p>',
      tags: [],
      draftId: 7,
    });

    expect(result).toBe(false);
    expect(showInfo).toHaveBeenCalledWith('每篇文章最多只能上传 2 个视频');
    expect(createArticle).not.toHaveBeenCalled();
    expect(addVideoForArticle).not.toHaveBeenCalled();
  });

  it('blocks updateAction before saving the article when deduped video ids exceed the limit', async () => {
    const store = useArticleStore();
    store.article = {
      id: 42,
      title: '已有文章',
      content: '<p>old</p>',
      images: [],
      videos: [{ id: 11, url: 'https://api.example/article/video/old.mp4' }],
      tags: [],
    };
    editorStoreState.pendingVideoIds = [3];
    extractVideosFromHtmlMock.mockReturnValue([]);
    extractVideoIdsFromHtmlMock.mockReturnValue([1, 2]);
    extractVideoReferencesFromHtmlMock.mockReturnValue([]);

    const result = await store.updateAction({
      articleId: 42,
      title: '更新后',
      content: '<p>正文</p>',
      tags: [],
      draftId: 7,
    });

    expect(result).toBe(false);
    expect(showInfo).toHaveBeenCalledWith('每篇文章最多只能上传 2 个视频');
    expect(changeTags).not.toHaveBeenCalled();
    expect(updateArticle).not.toHaveBeenCalled();
    expect(addVideoForArticle).not.toHaveBeenCalled();
  });
});
