<template>
  <div class="tiptap-editor-container" ref="editorContainerRef">
    <!-- 工具栏 -->
    <TiptapToolbar :editor="editor" />

    <!-- 编辑区域 -->
    <EditorContent
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
import { useEditor, EditorContent, type Extensions } from '@tiptap/vue-3';
// Tiptap v3.x 中 BubbleMenu 需要从 /menus 子路径导入
import { BubbleMenu } from '@tiptap/vue-3/menus';
import TiptapToolbar from './TiptapToolbar.vue';
import CompletionPopover from './extensions/AiCompletion/CompletionPopover.vue';
import { getTiptapExtensions } from './config';
import { LocalCache, isEmptyObj, emitter, Msg } from '@/utils';
import type { IArticle } from '@/stores/types/article.result';
import type { CompletionSuggestion, CompletionState, PopoverPosition } from './extensions/AiCompletion/types';
// 引入样式
import './styles/tiptap.scss';

// Markdown storage 类型（使用 unknown 避免类型冲突）
interface MarkdownStorageType {
  getMarkdown?: () => string;
}

type EditorInstance = ReturnType<typeof useEditor>['value'] | any;

const props = withDefaults(
  defineProps<{
    editData?: IArticle;
    mode?: 'default' | 'simple';
    height?: string;
  }>(),
  {
    editData: () => ({}) as IArticle,
    mode: 'default',
    height: '100vh',
  },
);

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
}>();

// 拖拽状态管理
const isDragging = ref(false);

// 编辑器容器引用（用于计算弹出框位置）
const editorContainerRef = ref<HTMLElement | null>(null);
const editorRect = ref<DOMRect | null>(null);

// AI 补全状态
const completionState = ref<CompletionState>('idle');
const completionSuggestions = ref<CompletionSuggestion[]>([]);
const completionPosition = ref<PopoverPosition | null>(null);
const completionActiveIndex = ref(0);
const DEFAULT_VIDEO_WIDTH = 360;

// 获取 Markdown 内容的辅助函数
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

// 创建编辑器实例
const editor: any = useEditor({
  extensions: getTiptapExtensions() as Extensions,
  content: '',
  autofocus: false,
  onUpdate: ({ editor: editorInstance }: { editor: EditorInstance }) => {
    // 始终发送 HTML 内容给父组件，确保预览和保存的一致性
    const content = editorInstance.getHTML();
    console.log('[TiptapEditor] onUpdate 触发 (HTML):', content);

    emit('update:content', content || '');
  },
});

// 初始化内容
onMounted(() => {
  nextTick(() => {
    if (!editor.value) return;

    const draft = LocalCache.getCache('draft');
    const isEditMode = !isEmptyObj(props.editData);

    let initialContent = '';

    if (isEditMode && draft) {
      // 编辑模式 + 有草稿：优先使用草稿
      initialContent = draft.draft;
    } else if (isEditMode) {
      // 编辑模式 + 无草稿：使用原文章内容
      initialContent = props.editData?.content ?? '';
    } else if (draft) {
      // 创建模式 + 有草稿：恢复草稿
      initialContent = draft.draft;
    }

    if (initialContent) {
      editor.value.chain().setContent(initialContent).run();
    }

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
      editor.value
        .chain()
        .setContent(content as string)
        .run();
    }
  });
});

// 监听 editData.content 变化，解决异步加载时序问题
// 同时监听 editor 和 editData.content，确保两者都准备好后才设置内容
watch(
  [() => editor.value, () => props.editData?.content],
  ([editorInstance, newContent]) => {
    if (!editorInstance || !newContent) return;

    const currentHTML = editorInstance.getHTML();
    const currentMD = getMarkdownContent(editorInstance);

    // 避免重复设置相同内容（防止覆盖用户输入或触发循环更新）
    // 如果新内容与当前 HTML 或当前 Markdown 一致，说明不需要更新
    if (newContent === currentHTML || newContent === currentMD) {
      return;
    }

    // 注意：空编辑器的 HTML 是 '<p></p>'
    const isEmpty = currentHTML === '<p></p>' || currentHTML === '';
    if (isEmpty || (currentHTML !== newContent && currentMD !== newContent)) {
      console.log('[TiptapEditor] 设置编辑器内容:', {
        newContentLength: newContent.length,
        currentHTML: currentHTML.substring(0, 20),
        currentMD: currentMD.substring(0, 20),
      });
      editorInstance.chain().setContent(newContent).run();
    }
  },
  { immediate: true },
);

// BubbleMenu 链接处理
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
  if (currentEditor.isActive('video')) return false;
  return !state.selection.empty;
};

const shouldShowVideoBubbleMenu = ({ editor: currentEditor }: { editor: any }) => {
  if (!currentEditor) return false;
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
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 只有离开编辑器容器时才取消高亮
  if (e.target === e.currentTarget) {
    isDragging.value = false;
  }
};

const handleDrop = async (e: DragEvent) => {
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

  // 串行上传所有图片，确保按顺序插入
  for (const file of imageFiles) {
    editor.value?.commands.uploadImage(file);
    // 等待当前图片上传完成
    const storage = editor.value?.storage as { imageUpload?: { getUploadPromise?: (file: File) => Promise<void> } };
    const promise = storage?.imageUpload?.getUploadPromise?.(file);
    if (promise) {
      await promise;
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
  setContent: (content: string) => editor.value?.chain().setContent(content).run(),
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
</style>
