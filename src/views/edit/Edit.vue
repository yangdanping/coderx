<template>
  <div class="edit">
    <!-- 数据就绪后才渲染编辑器 ,即 await 接口返回数据） -->
    <template v-if="isDataReady">
      <!-- 下拉标题 + 表单控件区域 -->
      <PullDownHeader
        v-model="articleTitle"
        v-model:isPulled="isPulled"
        v-model:tags="selectedTags"
        v-model:coverPreviewUrl="coverPreviewUrl"
        :draftId="autosave.draftId.value"
        :editData="editData"
        :draft="preview"
        @discard-draft="handleDiscardDraft"
        @formSubmit="formSubmit"
      />

      <!-- 直接使用 TiptapEditor -->
      <div class="editor-wrapper" :class="{ 'is-pulled': isPulled }">
        <!-- 顶部边框触发区 -->
        <div class="top-border-trigger" @click="isPulled = !isPulled"></div>

        <!-- 绳子图标 -->
        <div class="rope-icon-wrapper" @click="isPulled = !isPulled">
          <img src="@/assets/img/pull.png" alt="pull" class="rope-icon" draggable="false" />
        </div>

        <TiptapEditor
          ref="editorRef"
          :editData="editData"
          :draftStatus="autosave.status.value"
          :lastSavedAt="autosave.lastSavedAt.value"
          :draftErrorMessage="autosave.errorMessage.value"
          @ready="handleEditorReady"
          @update:content="handleEditorHtmlUpdate"
          @update:json-content="handleEditorJsonUpdate"
        />
      </div>
    </template>
    <!-- 编辑模式下数据加载中显示 loading -->
    <div v-else class="editor-loading">
      <i-loading class="loading-icon" />
      <span>正在加载文章数据...</span>
    </div>
    <AiAssistant :context="preview" />
  </div>
</template>

<script lang="ts" setup>
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue';
import PullDownHeader from './cpns/PullDownHeader.vue';
import AiAssistant from '@/components/AiAssistant.vue';

import { hasMeaningfulArticleContent, resolveArticleEditorContent } from '@/service/article/article.content';
import { useDraftAutosave } from '@/composables/useDraftAutosave';
import type { DraftLocalFallback, DraftMeta, DraftRecord, TiptapDocContent } from '@/service/draft/draft.types';
import { Msg, isEmptyObj, LocalCache } from '@/utils';
import { EMPTY_TIPTAP_DOC, buildDraftMeta, normalizeTiptapDoc, resolveReferencedArticleMediaIds, resolveSelectedTagNames } from './draft.utils';

import useArticleStore from '@/stores/article.store';
import useEditorStore from '@/stores/editor.store';

const route = useRoute();

interface Props {
  borderColor?: string;
  defaultExpose?: number;
  pulledExpose?: number;
}

interface EditEditorExpose {
  getHTML: () => string;
  getJSON: () => TiptapDocContent | undefined;
  setContent: (content: string | TiptapDocContent, emitUpdate?: boolean) => void;
  setSelectionToEnd: () => void;
  getEditor: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  borderColor: 'var(--el-color-primary)',
  defaultExpose: 0.6,
  pulledExpose: 1,
});

const articleStore = useArticleStore();
const editorStore = useEditorStore();
const { article, tags } = storeToRefs(articleStore);
const { manualCoverImgId, pendingImageIds, pendingVideoIds } = storeToRefs(editorStore);

const isEdit = computed(() => !!route.query.editArticleId);
const articleId = computed(() => {
  if (!isEdit.value) return null;
  const normalizedId = Number(route.query.editArticleId);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
});
const editData = computed(() => (isEdit.value ? article.value : {}));

const editorRef = ref<EditEditorExpose | null>(null);
const preview = ref('');
const jsonContent = ref<TiptapDocContent>(EMPTY_TIPTAP_DOC);
const articleTitle = ref('');
const selectedTags = ref<string[]>([]);
const coverPreviewUrl = ref<string | null>(null);
const isPulled = ref(false);
const isSubmitting = ref(false);
const isRestoring = ref(true);
const isAutosaveReady = ref(false);
const isDataReady = ref(!isEdit.value);
const editorReady = ref(false);
const isDiscardingDraft = ref(false);
const isLocalFallbackSyncLocked = ref(false);

const editorReadyResolvers: Array<() => void> = [];

const autosave = useDraftAutosave({
  scopeId: `article-draft:${articleId.value ?? 'new'}`,
  articleId: articleId.value,
  debounceMs: 1200,
});

const ropeTranslateY = computed(() => {
  const expose = isPulled.value ? props.pulledExpose : props.defaultExpose;
  return `-${(1 - expose) * 100}%`;
});

const referencedExistingMediaIds = computed(() =>
  resolveReferencedArticleMediaIds({
    contentJson: jsonContent.value,
    articleImages: article.value.images ?? [],
    articleVideos: article.value.videos ?? [],
  }),
);

const currentDraftMeta = computed<DraftMeta>(() =>
  buildDraftMeta({
    selectedTagNames: selectedTags.value,
    availableTags: tags.value,
    existingImageIds: referencedExistingMediaIds.value.imageIds,
    existingVideoIds: referencedExistingMediaIds.value.videoIds,
    pendingImageIds: pendingImageIds.value,
    pendingVideoIds: pendingVideoIds.value,
    coverImageId: manualCoverImgId.value,
  }),
);

const currentDraftSnapshot = computed(() => ({
  articleId: articleId.value,
  title: articleTitle.value.trim() || null,
  content: normalizeTiptapDoc(jsonContent.value),
  meta: currentDraftMeta.value,
}));

const hasMeaningfulDraft = computed(() => {
  return Boolean(
    articleTitle.value.trim() ||
      selectedTags.value.length ||
      manualCoverImgId.value ||
      pendingImageIds.value.length ||
      pendingVideoIds.value.length ||
      hasMeaningfulArticleContent(jsonContent.value),
  );
});

const localFallbackPayload = computed<DraftLocalFallback>(() => ({
  title: articleTitle.value,
  tags: [...selectedTags.value],
  draft: preview.value,
  jsonContent: normalizeTiptapDoc(jsonContent.value),
  fileList: coverPreviewUrl.value ? [{ url: coverPreviewUrl.value, name: 'cover' }] : [],
  pendingImageIds: [...pendingImageIds.value],
  pendingVideoIds: [...pendingVideoIds.value],
  draftId: autosave.draftId.value,
  articleId: articleId.value,
  version: autosave.version.value,
  lastSavedAt: autosave.lastSavedAt.value,
}));

const syncLocalFallbackCache = () => {
  if (isDiscardingDraft.value) {
    LocalCache.removeCache('draft');
    return;
  }

  // 发布/更新过程中，store 会主动清理本地草稿；这里不能再把它写回去。
  if (isSubmitting.value || isLocalFallbackSyncLocked.value) {
    return;
  }

  if (hasMeaningfulDraft.value && (autosave.hasUnsavedChanges.value || !!autosave.draftId.value)) {
    LocalCache.setCache('draft', localFallbackPayload.value);
  } else {
    LocalCache.removeCache('draft');
  }
};

const getArticleCoverPreviewUrl = () => {
  return article.value.cover ?? null;
};

const syncEditorRefsFromInstance = () => {
  preview.value = editorRef.value?.getHTML() ?? '';
  jsonContent.value = normalizeTiptapDoc(editorRef.value?.getJSON());
};

const resolveEditorReady = () => {
  if (editorReady.value) return;

  editorReady.value = true;
  while (editorReadyResolvers.length) {
    editorReadyResolvers.shift()?.();
  }
};

const waitForEditorReady = async () => {
  await nextTick();

  if (editorReady.value || editorRef.value?.getEditor?.()) {
    resolveEditorReady();
    return;
  }

  await new Promise<void>((resolve) => {
    editorReadyResolvers.push(resolve);
  });
  await nextTick();
};

const setEditorDocument = async (content: string | TiptapDocContent, emitUpdate = false) => {
  await waitForEditorReady();
  editorRef.value?.setContent(content, emitUpdate);
  await nextTick();
  syncEditorRefsFromInstance();
};

const restoreEditorFiles = (meta: Partial<DraftMeta> = {}) => {
  editorStore.clearPendingFiles();

  const imageIds = Array.isArray(meta.imageIds) ? meta.imageIds : [];
  const videoIds = Array.isArray(meta.videoIds) ? meta.videoIds : [];
  const coverImageId = Number.isInteger(meta.coverImageId) && Number(meta.coverImageId) > 0 ? Number(meta.coverImageId) : null;

  const restoredImageIds = coverImageId ? Array.from(new Set([...imageIds, coverImageId])) : imageIds;
  restoredImageIds.forEach((id) => editorStore.addPendingImageId(id));
  videoIds.forEach((id) => editorStore.addPendingVideoId(id));
  editorStore.setManualCoverImgId(coverImageId);
};

const applyRemoteDraft = async (draft: DraftRecord, localFallback?: DraftLocalFallback | null) => {
  articleTitle.value = draft.title ?? '';
  selectedTags.value = resolveSelectedTagNames(draft.meta.selectedTagIds ?? [], tags.value);
  coverPreviewUrl.value = localFallback?.draftId === draft.id ? (localFallback.fileList?.[0]?.url ?? null) : getArticleCoverPreviewUrl();
  restoreEditorFiles(draft.meta);
  await setEditorDocument(normalizeTiptapDoc(draft.content), false);
};

const applyLocalFallback = async (draft: DraftLocalFallback) => {
  articleTitle.value = draft.title ?? '';
  selectedTags.value = [...(draft.tags ?? [])];
  coverPreviewUrl.value = draft.fileList?.[0]?.url ?? null;
  editorStore.clearPendingFiles();
  draft.pendingImageIds?.forEach((id: number) => editorStore.addPendingImageId(id));
  draft.pendingVideoIds?.forEach((id: number) => editorStore.addPendingVideoId(id));
  if (draft.draftId && draft.version) {
    autosave.hydrateFromDraft({
      id: draft.draftId,
      articleId: draft.articleId ?? articleId.value,
      title: draft.title ?? null,
      content: normalizeTiptapDoc(draft.jsonContent ?? EMPTY_TIPTAP_DOC),
      meta: buildDraftMeta({
        selectedTagNames: draft.tags ?? [],
        availableTags: tags.value,
        pendingImageIds: draft.pendingImageIds ?? [],
        pendingVideoIds: draft.pendingVideoIds ?? [],
        coverImageId: null,
      }),
      version: draft.version,
      updateAt: draft.lastSavedAt ?? undefined,
    });
  }
  await setEditorDocument(draft.jsonContent ?? draft.draft ?? EMPTY_TIPTAP_DOC, false);
};

const applyExistingArticle = async () => {
  articleTitle.value = article.value.title ?? '';
  selectedTags.value = article.value.tags?.map((tag) => tag.name ?? '').filter(Boolean) ?? [];
  coverPreviewUrl.value = getArticleCoverPreviewUrl();
  editorStore.clearPendingFiles();

  const content = resolveArticleEditorContent(article.value);

  if (typeof content === 'string' ? content : content?.type) {
    await setEditorDocument(content, false);
  } else {
    preview.value = '';
    jsonContent.value = EMPTY_TIPTAP_DOC;
  }
};

const initializeEditorState = async () => {
  autosave.setHydrating(true);
  isRestoring.value = true;

  const cachedDraft = (LocalCache.getCache('draft') as DraftLocalFallback | undefined) ?? null;
  const localFallback = cachedDraft && (cachedDraft.articleId ?? null) === articleId.value ? cachedDraft : null;
  const remoteDraft = await autosave.loadDraft();

  if (remoteDraft) {
    await applyRemoteDraft(remoteDraft, localFallback);
  } else if (localFallback) {
    await applyLocalFallback(localFallback);
  } else if (isEdit.value) {
    await applyExistingArticle();
  } else {
    preview.value = '';
    jsonContent.value = EMPTY_TIPTAP_DOC;
    editorStore.clearPendingFiles();
    coverPreviewUrl.value = null;
  }

  autosave.setHydrating(false);
  isRestoring.value = false;
  isAutosaveReady.value = true;
  syncLocalFallbackCache();
};

const handleEditorHtmlUpdate = (content: string) => {
  preview.value = content;
};

const handleEditorJsonUpdate = (content: Record<string, unknown>) => {
  jsonContent.value = normalizeTiptapDoc(content);
};

const handleEditorReady = () => {
  resolveEditorReady();
};

const handleDiscardDraft = () => {
  isDiscardingDraft.value = true;
  autosave.cancelPendingSave();
  autosave.resetState();
  LocalCache.removeCache('draft');
};

const handlePublishSuccessCleanup = () => {
  isDiscardingDraft.value = true;
  autosave.cancelPendingSave();
  autosave.resetState();
  LocalCache.removeCache('draft');
};

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (autosave.hasUnsavedChanges.value && !isSubmitting.value) {
    const message = '未保存的内容将会丢失，确定要离开吗？';
    event.preventDefault();
    event.returnValue = message;
    return message;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'q') {
    event.preventDefault();
    isPulled.value = !isPulled.value;
  }
};

onMounted(async () => {
  if (!tags.value.length) {
    await articleStore.getTagsAction();
  }

  if (isEdit.value) {
    const hasData = isEmptyObj(editData.value);
    if (!hasData && articleId.value) {
      await articleStore.getDetailAction(String(articleId.value));
    }
    isDataReady.value = true;
  }

  await nextTick();
  await initializeEditorState();
  editorRef.value?.setSelectionToEnd();

  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('keydown', handleKeyDown);

  while (editorReadyResolvers.length) {
    editorReadyResolvers.shift()?.();
  }
});

watch(
  currentDraftSnapshot,
  (snapshot) => {
    if (isDiscardingDraft.value) return;
    if (!isAutosaveReady.value || isRestoring.value || isSubmitting.value) return;
    if (!hasMeaningfulDraft.value && !autosave.draftId.value) return;
    autosave.scheduleSave(snapshot);
  },
  { deep: true },
);

watch(
  localFallbackPayload,
  () => {
    if (!isAutosaveReady.value) return;
    syncLocalFallbackCache();
  },
  { deep: true },
);

const formSubmit = async (formData: { title: string; tags: string[] }) => {
  if (!formData.title) {
    Msg.showFail('请输入标题!');
    return;
  }

  const normalizedContent = normalizeTiptapDoc(jsonContent.value);

  if (!hasMeaningfulArticleContent(normalizedContent)) {
    Msg.showFail('请输入内容!');
    return;
  }

  isSubmitting.value = true;
  isLocalFallbackSyncLocked.value = true;
  let submitSucceeded = false;

  try {
    await autosave.flushPendingSave();

    if (!isEdit.value) {
      submitSucceeded = !!(await articleStore.createAction({
        title: formData.title,
        contentJson: normalizedContent,
        tags: formData.tags,
        draftId: autosave.draftId.value,
      }));
    } else {
      const currentArticleId = article.value.id;
      if (!currentArticleId) {
        Msg.showFail('文章信息缺失，请刷新后重试');
        return;
      }

      submitSucceeded = !!(await articleStore.updateAction({
        articleId: currentArticleId,
        title: formData.title,
        contentJson: normalizedContent,
        tags: formData.tags,
        draftId: autosave.draftId.value,
      }));
    }

    if (submitSucceeded) {
      handlePublishSuccessCleanup();
    }
  } finally {
    await nextTick();
    if (!submitSucceeded) {
      isLocalFallbackSyncLocked.value = false;
    }
    isSubmitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.edit {
  display: flex;
  flex-direction: column;
  height: 100vh; // 确保占满整个视口高度

  .editor-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--text-secondary);
    font-size: 14px;
    gap: 12px;

    .loading-icon {
      font-size: 32px;
      animation: spin 1s linear infinite;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .editor-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
    min-height: 0;

    &.is-pulled {
      :deep(.tiptap-editor-container) {
        border-top-color: v-bind('props.borderColor');
        border-top-width: 2px;
      }
    }

    .top-border-trigger {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px; // 更加精确的顶边触发区
      cursor: pointer;
      z-index: 105; // 确保在所有内容之上
      transition: background-color 0.2s;

      &:hover {
        background-color: v-bind('props.borderColor');
      }

      // 只有 hover 触发器时，下方的编辑器边框才变粗
      &:hover ~ :deep(.tiptap-editor-container) {
        border-top-width: 4px !important; // 强制覆盖
        border-top-color: v-bind('props.borderColor') !important;
      }
    }

    .rope-icon-wrapper {
      position: absolute;
      top: 0;
      right: 40px;
      width: 30px;
      height: 150px; // 维持一定高度以便点击 handle
      cursor: pointer;
      z-index: 101;
      display: flex;
      justify-content: center;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
      transform: translateY(v-bind(ropeTranslateY));
      pointer-events: none; // 默认禁用，由子元素 handle 响应
      user-select: none;

      .rope-icon {
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: auto; // 只有绳子图标本身响应点击
        // 使用 drop-shadow 生成与透明 PNG 轮廓完全一致的阴影
        filter: drop-shadow(4px 5px 5px rgba(0, 0, 0, 0.25)); // 向右偏移  向下偏移 阴影模糊半径
        transition: filter 0.3s;

        &:hover {
          // 鼠标悬浮时稍微加深阴影并增加偏移，增加“可拉拽”的立体交互感
          filter: drop-shadow(4px 7px 6px rgba(0, 0, 0, 0.35));
        }
      }
    }
  }

  // 确保编辑器能占满剩余空间
  :deep(.tiptap-editor-container) {
    flex: 1;
    min-height: 0;
    transition:
      border-width 0.2s,
      border-color 0.2s;
    border-top: 1px solid var(--el-border-color);
  }
}
</style>
