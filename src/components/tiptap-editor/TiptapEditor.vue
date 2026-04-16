<template>
  <div class="tiptap-editor-container" ref="editorContainerRef">
    <!-- 工具栏 -->
    <TiptapToolbar
      :editor="editor"
      :isSplitPreviewActive="isSplitPreviewActive"
      :draftStatus="draftStatus"
      :lastSavedAt="lastSavedAt"
      :draftErrorMessage="draftErrorMessage"
      :resolveImageUploadOptions="resolveToolbarImageUploadOptions"
      :insertSplitPreviewBlockquote="insertSplitPreviewBlockquote"
      @toggle-split-preview="toggleSplitPreview"
    />

    <div
      v-show="isSplitPreviewActive"
      class="tiptap-split-preview"
      :class="{ 'is-dragging': isDragging }"
      data-testid="markdown-split-preview"
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <section class="markdown-panel markdown-panel--source">
        <div class="markdown-panel__label">Markdown</div>
        <textarea
          ref="markdownSourceInputRef"
          v-model="markdownSource"
          data-testid="markdown-source-input"
          class="markdown-panel__textarea"
          spellcheck="false"
          @input="handleMarkdownSourceInput"
          @focus="handleMarkdownSourceFocus"
          @blur="handleMarkdownSourceBlur"
          @select="handleMarkdownSourceSelectionChange"
          @click="handleMarkdownSourceSelectionChange"
          @keyup="handleMarkdownSourceSelectionChange"
        />
      </section>

      <div class="split-preview-divider" data-testid="split-preview-divider" aria-hidden="true"></div>

      <section class="markdown-panel markdown-panel--preview">
        <div class="markdown-panel__label">Preview</div>
        <div data-testid="markdown-preview-panel" class="markdown-panel__preview editor-content-view" v-dompurify-html="renderedMarkdownPreview"></div>
      </section>
    </div>

    <!-- 编辑区域 -->
    <EditorContent
      v-show="!isSplitPreviewActive"
      :editor="editor"
      class="tiptap-editor-content"
      :class="{ 'is-dragging': isDragging }"
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    />

    <!-- BubbleMenu：仅选中文字时显示 -->
    <BubbleMenu :editor="editor as any" :tippy-options="{ duration: 100 }" :should-show="shouldShowTextBubbleMenu" v-if="editor" class="tiptap-bubble-menu">
      <el-button size="small" :type="editor.isActive('bold') ? 'primary' : ''" plain @click="editor.chain().focus().toggleBold().run()"> 加粗 </el-button>
      <el-button size="small" :type="editor.isActive('italic') ? 'primary' : ''" plain @click="editor.chain().focus().toggleItalic().run()"> 斜体 </el-button>
      <el-button size="small" :type="editor.isActive('link') ? 'primary' : ''" plain @click="handleBubbleLink"> 链接 </el-button>
    </BubbleMenu>

    <!-- BubbleMenu：仅选中视频时显示 -->
    <BubbleMenu :editor="editor as any" :tippy-options="{ duration: 100 }" :should-show="shouldShowVideoBubbleMenu" v-if="editor" class="tiptap-bubble-menu">
      <el-button size="small" plain @click="applyVideoSize('320')"> 小 </el-button>
      <el-button size="small" plain @click="applyVideoSize('480')"> 中 </el-button>
      <el-button size="small" plain @click="applyVideoSize('640')"> 大 </el-button>
      <el-button size="small" plain @click="applyVideoFullWidth"> 铺满 </el-button>
      <el-button size="small" plain @click="customVideoSize"> 自定义 </el-button>
    </BubbleMenu>

    <!-- AI 补全弹出框 -->
    <CompletionPopover
      :state="completionState"
      :suggestions="completionSuggestions"
      :position="completionPosition"
      :activeIndex="completionActiveIndex"
      :editorRect="editorRect"
      @select="handleCompletionSelect"
      @hover="handleCompletionHover"
    />
  </div>
</template>

<script lang="ts" setup>
import MarkdownIt from 'markdown-it';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
// Tiptap v3.x 中 BubbleMenu 需要从 /menus 子路径导入
import { BubbleMenu } from '@tiptap/vue-3/menus';
import TiptapToolbar from './TiptapToolbar.vue';
import CompletionPopover from './extensions/AiCompletion/CompletionPopover.vue';
import { resolveArticleEditorContent } from '@/service/article/article.content';
import { getTiptapExtensions } from './config';
import useEditorStore, { getVideoMetaById } from '@/stores/editor.store';
import { annotateLegacyVideoIdsInHtml, emitter, Msg, SessionCache } from '@/utils';
import { buildImageHtml } from './extensions/ImageNode';
import { buildUnresolvedVideoPlaceholderHtml, buildVideoHtml, DEFAULT_VIDEO_STYLE, VIDEO_TOKEN_LINE_GLOBAL_PATTERN } from './extensions/VideoNode';
// 引入样式
import './styles/tiptap.scss';

import type { IArticle } from '@/stores/types/article.result';
import type { Extensions } from '@tiptap/vue-3';
import type { CompletionSuggestion, CompletionState, PopoverPosition } from './extensions/AiCompletion/types';
import type {
  EditorDocumentContent,
  EditorInstance,
  EditorJsonNode,
  InsertSplitPreviewBlockquote,
  MarkdownSourceSelection,
  MarkdownStorageType,
  ToolbarImageUploadOptions,
  UploadInsertSelection,
  VideoRegistryEntry,
} from './types';

// --- 常量与 props / emit -----------------------------------------------------
const SPLIT_PREVIEW_SESSION_KEY = 'tiptap-editor-split-preview-active';

const props = withDefaults(
  defineProps<{
    editData?: IArticle;
    mode?: 'default' | 'simple';
    height?: string;
    draftStatus?: import('@/composables/useDraftAutosave').DraftAutosaveStatus;
    lastSavedAt?: string | null;
    draftErrorMessage?: string;
  }>(),
  {
    editData: () => ({}) as IArticle,
    mode: 'default',
    height: '100vh',
    draftStatus: 'idle',
    lastSavedAt: null,
    draftErrorMessage: '',
  },
);

const resolvedEditDataContent = computed(() => resolveArticleEditorContent(props.editData));

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
  (e: 'update:json-content', content: Record<string, unknown>): void;
  (e: 'ready'): void;
}>();

// --- 响应式状态：分屏、编辑器容器、AI 补全 -----------------------------------
const isDragging = ref(false);
const initialSplitPreviewActive = SessionCache.getCache(SPLIT_PREVIEW_SESSION_KEY);
const isSplitPreviewActive = ref(typeof initialSplitPreviewActive === 'boolean' ? initialSplitPreviewActive : true);
const markdownSource = ref('');
const markdownSourceInputRef = ref<HTMLTextAreaElement | null>(null);
const markdownSourceSelection = ref<MarkdownSourceSelection>({
  start: 0,
  end: 0,
});
const isMarkdownSourceFocused = ref(false);
const isApplyingMarkdownSource = ref(false);
const hasEmittedReady = ref(false);
const previewVideoRegistryVersion = ref(0);
const editorStore = useEditorStore();

// 编辑器容器引用（用于计算弹出框位置）
const editorContainerRef = ref<HTMLElement | null>(null);
const editorRect = ref<DOMRect | null>(null);

// AI 补全状态
const completionState = ref<CompletionState>('idle');
const completionSuggestions = ref<CompletionSuggestion[]>([]);
const completionPosition = ref<PopoverPosition | null>(null);
const completionActiveIndex = ref(0);
const DEFAULT_VIDEO_WIDTH = 360;
const markdownRenderer = new MarkdownIt({
  // Keep custom node raw HTML (for example <video>) visible in split preview.
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

// --- 文档类型、Markdown / HTML 解析、视频注册 --------------------------------
const getMarkdownContent = (editorInstance: EditorInstance) => {
  if (!editorInstance) return '';

  // Tiptap v3 (@tiptap/markdown) 直接在 editor 实例上提供了 getMarkdown 方法
  if (typeof editorInstance.getMarkdown === 'function') {
    return editorInstance.getMarkdown();
  }

  // 备选方案：尝试从 storage 获取（兼容旧版本或其他插件）
  const storage = editorInstance.storage.markdown as MarkdownStorageType;
  return storage?.getMarkdown?.() ?? '';
};

const getContentType = (content: EditorDocumentContent) => {
  if (typeof content !== 'string') {
    return 'json';
  }

  return /<[a-z][\s\S]*>/i.test(content) ? 'html' : 'markdown';
};

const normalizeVideoId = (videoId: unknown) => {
  const normalizedId = Number(videoId);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

const normalizeIncomingDocumentContent = (content: EditorDocumentContent): EditorDocumentContent => {
  if (typeof content !== 'string') {
    return content;
  }

  if (getContentType(content) !== 'html') {
    return content;
  }

  return annotateLegacyVideoIdsInHtml(content, props.editData?.videos ?? []);
};

const collectVideoRegistryEntries = (node?: EditorJsonNode): VideoRegistryEntry[] => {
  if (!node) return [];

  const entries: VideoRegistryEntry[] = [];
  const attrs = node.attrs && typeof node.attrs === 'object' ? node.attrs : {};
  const videoId = normalizeVideoId(attrs.videoId);
  const src = typeof attrs.src === 'string' ? attrs.src : '';

  if (node.type === 'video' && videoId && src) {
    entries.push({
      videoId,
      src,
      poster: typeof attrs.poster === 'string' ? attrs.poster : null,
      controls: attrs.controls !== false,
      style: typeof attrs.style === 'string' ? attrs.style : DEFAULT_VIDEO_STYLE,
    });
  }

  node.content?.forEach((childNode) => {
    entries.push(...collectVideoRegistryEntries(childNode));
  });

  return entries;
};

const syncVideoRegistryFromEditor = (editorInstance: EditorInstance) => {
  const jsonContent = editorInstance?.getJSON?.() as EditorJsonNode | undefined;
  if (!jsonContent) return;

  const dedupedEntries = Array.from(
    new Map(collectVideoRegistryEntries(jsonContent).map((entry) => [entry.videoId, entry] as const)).values(),
  );

  if (dedupedEntries.length) {
    editorStore.registerVideoMetas(dedupedEntries);
    previewVideoRegistryVersion.value += 1;
  }
};

const syncArticleVideoRegistryFromProps = () => {
  const articleVideos = props.editData?.videos ?? [];
  const nextEntries = articleVideos
    .map((video): VideoRegistryEntry | null => {
      const videoId = normalizeVideoId(video?.id);
      const src = typeof video?.url === 'string' ? video.url : '';

      if (!videoId || !src) {
        return null;
      }

      return {
        videoId,
        src,
        poster: null,
        controls: true,
        style: DEFAULT_VIDEO_STYLE,
      };
    })
    .filter((entry): entry is VideoRegistryEntry => !!entry);

  if (nextEntries.length) {
    editorStore.registerVideoMetas(nextEntries);
    previewVideoRegistryVersion.value += 1;
  }
};

const replaceVideoTokensWithPreviewHtml = (markdown: string, videoRegistryById: Record<number, VideoRegistryEntry>) => {
  VIDEO_TOKEN_LINE_GLOBAL_PATTERN.lastIndex = 0;
  return markdown.replace(VIDEO_TOKEN_LINE_GLOBAL_PATTERN, (_rawToken, videoIdText: string) => {
    const videoId = Number(videoIdText);
    const videoMeta = videoRegistryById[videoId] ?? getVideoMetaById(videoId);
    return videoMeta?.src ? buildVideoHtml(videoMeta) : buildUnresolvedVideoPlaceholderHtml(videoId);
  });
};

const renderedMarkdownPreview = computed(() => {
  void previewVideoRegistryVersion.value;
  return markdownRenderer.render(replaceVideoTokensWithPreviewHtml(markdownSource.value || '', editorStore.videoRegistryById));
});

const syncMarkdownSourceFromEditor = (editorInstance: EditorInstance) => {
  if (!editorInstance) return;

  const nextMarkdown = getMarkdownContent(editorInstance);
  if (nextMarkdown !== markdownSource.value) {
    markdownSource.value = nextMarkdown;
  }
};

const setEditorDocumentContent = (editorInstance: EditorInstance, content: EditorDocumentContent, emitUpdate = true) => {
  if (!editorInstance || content == null) return;

  const normalizedContent = normalizeIncomingDocumentContent(content);

  editorInstance.commands.setContent(normalizedContent, {
    contentType: getContentType(normalizedContent),
    emitUpdate,
  });

  // Restoring remote drafts often suppresses onUpdate; keep split preview in sync anyway.
  syncVideoRegistryFromEditor(editorInstance);
  syncMarkdownSourceFromEditor(editorInstance);
};

const setEditorMarkdownContent = (editorInstance: EditorInstance, content: string) => {
  if (!editorInstance || content == null) return;

  // Rebuild the registry before reparsing markdown tokens so existing [[video:id]] values stay resolvable.
  syncArticleVideoRegistryFromProps();
  syncVideoRegistryFromEditor(editorInstance);
  editorInstance.commands.setContent(content, {
    contentType: 'markdown',
    emitUpdate: true,
  });
};

const getCurrentInsertSelection = (editorInstance: EditorInstance): UploadInsertSelection | null => {
  const selection = editorInstance?.state?.selection;
  if (!selection) return null;

  const { from, to } = selection;
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return null;
  }

  return { from, to };
};

const getDropInsertSelection = (editorInstance: EditorInstance, event: DragEvent): UploadInsertSelection | null => {
  const position = editorInstance?.view?.posAtCoords?.({
    left: event.clientX,
    top: event.clientY,
  });

  if (position && Number.isInteger(position.pos)) {
    return {
      from: position.pos,
      to: position.pos,
    };
  }

  return getCurrentInsertSelection(editorInstance);
};

const isExternalFileDrag = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');

const focusMarkdownSourceToEnd = () => {
  const textarea = markdownSourceInputRef.value;
  if (!textarea) return;

  const end = markdownSource.value.length;
  textarea.focus();
  textarea.setSelectionRange(end, end);
  isMarkdownSourceFocused.value = true;
  updateMarkdownSourceSelection(textarea);
};

const setSelectionToEnd = () => {
  if (!editor.value) return;

  const endPosition = editor.value.state?.doc?.content?.size;
  const hasEndPosition = Number.isInteger(endPosition);

  if (hasEndPosition) {
    editor.value.commands.setTextSelection(endPosition);
  }

  if (isSplitPreviewActive.value) {
    syncMarkdownSourceFromEditor(editor.value);
    nextTick(() => {
      focusMarkdownSourceToEnd();
    });
    return;
  }

  if (typeof editor.value.commands?.focus === 'function') {
    editor.value.commands.focus('end');
  }
};

const updateMarkdownSourceSelection = (textarea = markdownSourceInputRef.value): MarkdownSourceSelection | null => {
  if (!textarea) return null;

  const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : 0;
  const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : start;
  markdownSourceSelection.value = {
    start,
    end,
  };
  return markdownSourceSelection.value;
};

const handleMarkdownSourceFocus = (event: FocusEvent) => {
  isMarkdownSourceFocused.value = true;
  updateMarkdownSourceSelection(event.target as HTMLTextAreaElement);
};

const handleMarkdownSourceBlur = () => {
  isMarkdownSourceFocused.value = false;
};

const handleMarkdownSourceSelectionChange = (event: Event) => {
  updateMarkdownSourceSelection(event.target as HTMLTextAreaElement);
};

const insertTextIntoMarkdownSource = (text: string, selection: MarkdownSourceSelection) => {
  const currentMarkdown = markdownSource.value;
  const safeStart = Math.max(0, Math.min(selection.start, currentMarkdown.length));
  const safeEnd = Math.max(safeStart, Math.min(selection.end, currentMarkdown.length));
  const nextMarkdown = `${currentMarkdown.slice(0, safeStart)}${text}${currentMarkdown.slice(safeEnd)}`;
  const nextCaret = safeStart + text.length;

  markdownSource.value = nextMarkdown;
  handleMarkdownSourceInput();

  nextTick(() => {
    const textarea = markdownSourceInputRef.value;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(nextCaret, nextCaret);
    isMarkdownSourceFocused.value = true;
    updateMarkdownSourceSelection(textarea);
  });
};

const resolveToolbarImageUploadOptions = (): ToolbarImageUploadOptions | null => {
  if (!isSplitPreviewActive.value || !isMarkdownSourceFocused.value) {
    return null;
  }

  const selectionSnapshot = updateMarkdownSourceSelection();
  if (!selectionSnapshot) {
    return null;
  }

  return {
    onUploaded: ({ url, imgId }) => {
      insertTextIntoMarkdownSource(
        buildImageHtml({
          imageId: imgId,
          src: url,
          alt: '',
        }),
        selectionSnapshot,
      );
    },
  };
};

const insertSplitPreviewBlockquote: InsertSplitPreviewBlockquote = () => {
  if (!isSplitPreviewActive.value || !isMarkdownSourceFocused.value) {
    return;
  }

  const selectionSnapshot = updateMarkdownSourceSelection();
  if (!selectionSnapshot) {
    return;
  }

  // 分屏预览下直接往 Markdown 源码插入 `> `，并复用现有插入逻辑统一处理光标落点。
  insertTextIntoMarkdownSource('> ', selectionSnapshot);
};

const toggleSplitPreview = () => {
  if (!isSplitPreviewActive.value) {
    syncArticleVideoRegistryFromProps();
    syncVideoRegistryFromEditor(editor.value);
    syncMarkdownSourceFromEditor(editor.value);
  }

  isSplitPreviewActive.value = !isSplitPreviewActive.value;
  SessionCache.setCache(SPLIT_PREVIEW_SESSION_KEY, isSplitPreviewActive.value);
};

const handleMarkdownSourceInput = () => {
  if (!editor.value) return;

  isApplyingMarkdownSource.value = true;
  setEditorMarkdownContent(editor.value, markdownSource.value);

  nextTick(() => {
    isApplyingMarkdownSource.value = false;
  });
};

// --- 编辑器实例（extensions、onUpdate、就绪与内容同步 watch） ---------------
const editor: any = useEditor({
  extensions: getTiptapExtensions() as Extensions,
  content: '',
  contentType: 'markdown',
  autofocus: false,
  onUpdate: ({ editor: editorInstance }: { editor: EditorInstance }) => {
    // 始终发送 HTML 内容给父组件，确保预览和保存的一致性
    const content = editorInstance.getHTML();
    const jsonContent = editorInstance.getJSON?.() ?? { type: 'doc', content: [{ type: 'paragraph' }] };
    console.log('[TiptapEditor] onUpdate 触发 (HTML):', content);

    syncVideoRegistryFromEditor(editorInstance);

    if (!isApplyingMarkdownSource.value) {
      syncMarkdownSourceFromEditor(editorInstance);
    }

    emit('update:content', content || '');
    emit('update:json-content', jsonContent);
  },
});

watch(
  () => editor.value,
  (editorInstance) => {
    if (!editorInstance || hasEmittedReady.value) return;

    hasEmittedReady.value = true;
    emit('ready');
    syncVideoRegistryFromEditor(editorInstance);
    syncMarkdownSourceFromEditor(editorInstance);
  },
  { immediate: true },
);

watch(
  () => props.editData?.videos,
  () => {
    syncArticleVideoRegistryFromProps();
  },
  { immediate: true, deep: true },
);

// 初始化内容
onMounted(() => {
  nextTick(() => {
    if (!editor.value) return;

    syncArticleVideoRegistryFromProps();
    syncVideoRegistryFromEditor(editor.value);
    syncMarkdownSourceFromEditor(editor.value);

    // 注册 AI 补全状态变化回调
    const aiCompletionStorage = editor.value.storage.aiCompletion;
    if (aiCompletionStorage) {
      aiCompletionStorage.onStateChange = (state: CompletionState, suggestions: CompletionSuggestion[], position: PopoverPosition | null) => {
        completionState.value = state;
        completionSuggestions.value = suggestions;
        completionPosition.value = position;
        completionActiveIndex.value = aiCompletionStorage.activeIndex || 0;

        // 更新编辑器容器位置
        if (editorContainerRef.value) {
          editorRect.value = editorContainerRef.value.getBoundingClientRect();
        }
      };
    }
  });
});

// 监听事件总线
onMounted(() => {
  // 清空内容事件
  emitter.on('cleanContent', () => {
    editor.value?.chain().clearContent().run();
  });

  // 更新内容事件（用于编辑模式下从 store 获取内容）
  emitter.on('updateEditorContent', (content) => {
    if (editor.value && content) {
      setEditorDocumentContent(editor.value, content as EditorDocumentContent, true);
      syncMarkdownSourceFromEditor(editor.value);
    }
  });
});

// 监听 editData.content 变化，解决异步加载时序问题
// 同时监听 editor 和 editData.content，确保两者都准备好后才设置内容
watch(
  [() => editor.value, resolvedEditDataContent],
  ([editorInstance, newContent]) => {
    if (!editorInstance || !newContent) return;

    const normalizedContent = normalizeIncomingDocumentContent(newContent);
    const currentHTML = editorInstance.getHTML();
    const currentMD = getMarkdownContent(editorInstance);

    // 避免重复设置相同内容（防止覆盖用户输入或触发循环更新）
    // 如果新内容与当前 HTML 或当前 Markdown 一致，说明不需要更新
    if (normalizedContent === currentHTML || normalizedContent === currentMD) {
      return;
    }

    // 注意：空编辑器的 HTML 是 '<p></p>'
    const isEmpty = currentHTML === '<p></p>' || currentHTML === '';
    if (isEmpty || (currentHTML !== normalizedContent && currentMD !== normalizedContent)) {
      console.log('[TiptapEditor] 设置编辑器内容:', {
        newContentLength: typeof normalizedContent === 'string' ? normalizedContent.length : JSON.stringify(normalizedContent).length,
        currentHTML: currentHTML.substring(0, 20),
        currentMD: currentMD.substring(0, 20),
      });
      setEditorDocumentContent(editorInstance, normalizedContent, true);
      syncMarkdownSourceFromEditor(editorInstance);
    }
  },
  { immediate: true },
);

// --- BubbleMenu、视频尺寸、拖拽上传、AI 补全交互 ------------------------------
const handleBubbleLink = () => {
  const previousUrl = editor.value?.getAttributes('link').href;
  const url = window.prompt('请输入链接地址', previousUrl);

  if (url === null) {
    return; // 用户取消
  }

  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
};

const shouldShowTextBubbleMenu = ({ editor: currentEditor, state }: { editor: any; state: any }) => {
  if (!currentEditor || !state) return false;
  if (isSplitPreviewActive.value) return false;
  if (!currentEditor.isFocused) return false;
  if (currentEditor.isActive('video')) return false;
  return !state.selection.empty;
};

const shouldShowVideoBubbleMenu = ({ editor: currentEditor }: { editor: any }) => {
  if (!currentEditor) return false;
  if (isSplitPreviewActive.value) return false;
  if (!currentEditor.isFocused) return false;
  return currentEditor.isActive('video');
};

const applyVideoStyle = (style: string) => {
  if (!editor.value?.isActive('video')) return;
  editor.value.chain().focus().updateAttributes('video', { style }).run();
};

const applyVideoSize = (widthPx: string) => {
  applyVideoStyle(`width: ${widthPx}px; max-width: 100%; height: auto;`);
};

const applyVideoFullWidth = () => {
  applyVideoStyle('width: 100%; max-width: 100%; height: auto;');
};

const customVideoSize = () => {
  if (!editor.value?.isActive('video')) return;

  const rawWidth = window.prompt('请输入视频宽度(px)', String(DEFAULT_VIDEO_WIDTH));
  if (rawWidth === null) return;

  const widthValue = Number.parseInt(rawWidth.trim(), 10);
  if (!Number.isInteger(widthValue) || widthValue <= 0) {
    Msg.showFail('宽度请输入正整数');
    return;
  }

  const rawHeight = window.prompt('请输入视频高度(px)，留空保持比例', '');
  if (rawHeight === null) return;

  let heightRule = 'auto';
  if (rawHeight.trim()) {
    const heightValue = Number.parseInt(rawHeight.trim(), 10);
    if (!Number.isInteger(heightValue) || heightValue <= 0) {
      Msg.showFail('高度请输入正整数，或留空自动');
      return;
    }
    heightRule = `${heightValue}px`;
  }

  applyVideoStyle(`width: ${widthValue}px; max-width: 100%; height: ${heightRule};`);
};

// 拖拽事件处理
const handleDragEnter = (e: DragEvent) => {
  if (!isExternalFileDrag(e)) return;

  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
};

const handleDragOver = (e: DragEvent) => {
  if (!isExternalFileDrag(e)) return;

  e.preventDefault();
  e.stopPropagation();
};

const handleDragLeave = (e: DragEvent) => {
  if (!isExternalFileDrag(e)) return;

  e.preventDefault();
  e.stopPropagation();
  // 只有离开编辑器容器时才取消高亮
  if (e.target === e.currentTarget) {
    isDragging.value = false;
  }
};

const handleDrop = async (e: DragEvent) => {
  if (!isExternalFileDrag(e)) return;

  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // 过滤出图片文件
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

  if (imageFiles.length === 0) {
    Msg.showWarn('请拖入图片文件');
    return;
  }

  let insertSelection = getDropInsertSelection(editor.value, e);

  // 串行上传所有图片，确保按顺序插入
  for (const file of imageFiles) {
    editor.value?.commands.uploadImage(file, { insertSelection });
    // 等待当前图片上传完成
    const storage = editor.value?.storage as { imageUpload?: { getUploadPromise?: (file: File) => Promise<void> } };
    const promise = storage?.imageUpload?.getUploadPromise?.(file);
    if (promise) {
      await promise;
      insertSelection = getCurrentInsertSelection(editor.value);
    }
  }
};

// AI 补全事件处理
const handleCompletionSelect = (index: number) => {
  const suggestion = completionSuggestions.value[index];
  if (suggestion && editor.value) {
    editor.value.commands.applyCompletion(suggestion.text);
  }
};

const handleCompletionHover = (index: number) => {
  completionActiveIndex.value = index;
  // 同步到 storage
  if (editor.value?.storage.aiCompletion) {
    editor.value.storage.aiCompletion.activeIndex = index;
  }
};

// 暴露方法供外部调用
defineExpose({
  // 获取 HTML 内容
  getHTML: () => editor.value?.getHTML() ?? '',
  // 获取 Markdown 内容
  getMarkdown: () => getMarkdownContent(editor.value),
  // 获取 JSON 内容
  getJSON: () => editor.value?.getJSON(),
  // 设置内容
  setContent: (content: EditorDocumentContent, emitUpdate = true) => setEditorDocumentContent(editor.value, content, emitUpdate),
  setSelectionToEnd,
  // 获取编辑器实例
  getEditor: () => editor.value,
});

// 组件销毁时清理
onBeforeUnmount(() => {
  emitter.off('cleanContent');
  emitter.off('updateEditorContent');
  editor.value?.destroy();
});
</script>

<style lang="scss" scoped>
// 组件特有样式（全局样式在 ./styles/tiptap.scss）
.tiptap-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--el-border-color);
  background: var(--bg-color-primary);
}

.tiptap-split-preview {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  flex: 1;
  min-height: 0;

  &.is-dragging {
    outline: 2px dashed var(--el-color-primary);
    outline-offset: -2px;
    background-color: rgba(64, 158, 255, 0.05);
  }
}

.markdown-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 24px;

  &__label {
    margin-bottom: 16px;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  &__textarea,
  &__preview {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  &__textarea {
    resize: none;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font:
      500 15px/1.8 'SFMono-Regular',
      Consolas,
      monospace;
    white-space: pre-wrap;
  }

  &__preview {
    padding-right: 8px;
  }

  &__preview:deep(h1),
  &__preview:deep(h2),
  &__preview:deep(h3),
  &__preview:deep(p),
  &__preview:deep(ul),
  &__preview:deep(ol),
  &__preview:deep(blockquote),
  &__preview:deep(pre) {
    margin-top: 0;
  }

  &__preview:deep(blockquote p) {
    // MarkdownIt 在 breaks 模式下会输出 <br>，这里改回 normal 避免 <br> 后的源码换行空白被 pre-wrap 额外显示成“空一行”。
    white-space: normal;
  }

  &__preview:deep(pre) {
    padding: 12px 14px;
    background: #1e1f29;
    color: #d7e4ff;
    overflow-x: auto;
  }

  &__preview:deep(code) {
    font-family: 'SFMono-Regular', Consolas, monospace;
  }

  &__preview:deep(.markdown-video-placeholder) {
    margin: 0 0 16px;
    padding: 12px 14px;
    border: 1px dashed #f59e0b;
    border-radius: 10px;
    background: rgba(245, 158, 11, 0.08);
    color: #92400e;
    font-size: 14px;
  }
}

.split-preview-divider {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 2px dashed #e5e7eb;
  pointer-events: none;
}

.tiptap-editor-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0; // 关键：让 flex 子元素能正确收缩
  transition: all 0.2s ease;
  background: var(--bg-color-primary);
  color: var(--text-primary);

  &.is-dragging {
    border: 2px dashed var(--el-color-primary);
    background-color: rgba(64, 158, 255, 0.05);
    // 添加内边距避免内容被边框遮挡
    padding: 8px;
  }
}

@media (max-width: 992px) {
  .tiptap-split-preview {
    grid-template-columns: 1fr;
  }

  .split-preview-divider {
    top: 50%;
    right: 18px;
    bottom: auto;
    left: 18px;
    transform: translateY(-50%);
    border-top: 2px dashed #e5e7eb;
    border-left: 0;
  }

  .markdown-panel {
    min-height: 280px;
  }
}
</style>
