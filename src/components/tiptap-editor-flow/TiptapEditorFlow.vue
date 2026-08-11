<script lang="ts" setup>
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import CommentToolbar from '@/components/tiptap-editor-comment/CommentToolbar.vue';
import { getCommentEditorExtensions, defaultCommentEditorConfig } from './config';
import './styles/flow-editor.scss';

import type { Extensions } from '@tiptap/core';
import type { TiptapDocContent } from '@/service/draft/draft.types';

const props = withDefaults(
  defineProps<{
    editContent?: string;
    editDocument?: TiptapDocContent;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    editContent: '',
    placeholder: '分享一点文字、链接或排版…',
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
  (e: 'update:document', content: TiptapDocContent): void;
}>();

const editorContainerRef = ref<HTMLElement | null>(null);
const isFocused = shallowRef(false);

const editor: any = useEditor({
  extensions: getCommentEditorExtensions(props.placeholder) as Extensions,
  content: '',
  editable: !props.disabled,
  ...defaultCommentEditorConfig,
  onUpdate: ({ editor: editorInstance }) => {
    emit('update:content', editorInstance.getHTML() || '');
    emit('update:document', editorInstance.getJSON());
  },
  onFocus: () => {
    isFocused.value = true;
  },
  onBlur: () => {
    isFocused.value = false;
  },
});

const isSameDocument = (content: TiptapDocContent) => JSON.stringify(editor.value?.getJSON()) === JSON.stringify(content);

const setEditorContent = (content: string | TiptapDocContent) => {
  if (!editor.value) return;

  if (typeof content === 'object' && isSameDocument(content)) return;
  if (typeof content === 'string' && editor.value.getHTML() === content) return;

  editor.value.commands.setContent(content, { emitUpdate: false });
};

watch(
  () => props.disabled,
  (disabled) => {
    editor.value?.setEditable(!disabled);
  },
  { immediate: true },
);

watch(
  () => props.editDocument,
  (newDocument) => {
    if (newDocument) setEditorContent(newDocument);
  },
  { deep: true },
);

watch(
  () => props.editContent,
  (newContent) => {
    if (props.editDocument || newContent === undefined) return;
    setEditorContent(newContent);
  },
);

onMounted(() => {
  nextTick(() => {
    if (!editor.value) return;
    const initialContent = props.editDocument ?? props.editContent;
    if (initialContent) setEditorContent(initialContent);
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

const handleBubbleLink = () => {
  const previousUrl = editor.value?.getAttributes('link').href;
  const url = window.prompt('请输入链接地址', previousUrl);

  if (url === null) return;

  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
};

defineExpose({
  getHTML: () => editor.value?.getHTML() ?? '',
  getJSON: () => normalizeFlowDocument(editor.value?.getJSON()),
  setContent: setEditorContent,
  getEditor: () => editor.value,
});

function normalizeFlowDocument(content: unknown): TiptapDocContent {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content as TiptapDocContent;
  }

  return { type: 'doc', content: [{ type: 'paragraph' }] };
}
</script>

<template>
  <div ref="editorContainerRef" class="flow-editor-container" :inert="disabled ? '' : undefined" :aria-disabled="disabled ? 'true' : undefined">
    <CommentToolbar :editor="editor" />

    <EditorContent :editor="editor" class="flow-editor-content" :class="{ 'is-focused': isFocused }" />

    <BubbleMenu v-if="editor" :editor="editor as any" :tippy-options="{ duration: 100 }" class="flow-bubble-menu">
      <el-button size="small" :type="editor.isActive('bold') ? 'primary' : ''" plain @click="editor.chain().focus().toggleBold().run()"> 加粗 </el-button>
      <el-button size="small" :type="editor.isActive('italic') ? 'primary' : ''" plain @click="editor.chain().focus().toggleItalic().run()"> 斜体 </el-button>
      <el-button size="small" :type="editor.isActive('link') ? 'primary' : ''" plain @click="handleBubbleLink"> 链接 </el-button>
    </BubbleMenu>
  </div>
</template>

<style lang="scss" scoped>
.flow-editor-container {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-color-primary);

  :deep(.comment-toolbar) {
    background: color-mix(in oklch, var(--bg-color-primary) 92%, transparent);
    border-bottom-color: var(--border-color-default);
    scrollbar-color: color-mix(in oklch, var(--fontColor) 28%, transparent) transparent;
  }

  :deep(.comment-toolbar .toolbar-btn.el-button.is-plain) {
    --el-button-text-color: var(--text-primary, var(--el-text-color-primary));
    --el-button-bg-color: transparent;
    --el-button-border-color: transparent;

    &:hover:not(.is-disabled) {
      --el-button-text-color: var(--text-primary, var(--el-text-color-primary));
      --el-button-bg-color: color-mix(in oklch, var(--fontColor) 9%, transparent);
    }
  }

  :deep(.comment-toolbar .toolbar-btn.el-button--primary.is-plain) {
    --el-button-text-color: var(--text-primary, var(--el-text-color-primary));
    --el-button-bg-color: color-mix(in oklch, var(--fontColor) 12%, transparent);
    --el-button-border-color: transparent;
  }
}
</style>
