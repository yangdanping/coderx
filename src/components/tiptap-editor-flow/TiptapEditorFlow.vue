<template>
  <div class="flow-editor-container" ref="editorContainerRef">
    <CommentToolbar :editor="editor" />

    <EditorContent :editor="editor" class="flow-editor-content" :class="{ 'is-focused': isFocused }" />

    <BubbleMenu :editor="editor as any" :tippy-options="{ duration: 100 }" v-if="editor" class="flow-bubble-menu">
      <el-button size="small" :type="editor.isActive('bold') ? 'primary' : ''" plain @click="editor.chain().focus().toggleBold().run()"> 加粗 </el-button>
      <el-button size="small" :type="editor.isActive('italic') ? 'primary' : ''" plain @click="editor.chain().focus().toggleItalic().run()"> 斜体 </el-button>
      <el-button size="small" :type="editor.isActive('link') ? 'primary' : ''" plain @click="handleBubbleLink"> 链接 </el-button>
    </BubbleMenu>
  </div>
</template>

<script lang="ts" setup>
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import CommentToolbar from '@/components/tiptap-editor-comment/CommentToolbar.vue';
import { getCommentEditorExtensions, defaultCommentEditorConfig } from './config';
import type { Extensions } from '@tiptap/core';

import './styles/flow-editor.scss';

const props = withDefaults(
  defineProps<{
    editContent?: string;
    placeholder?: string;
  }>(),
  {
    editContent: '',
    placeholder: '分享一点文字、链接或排版…',
  },
);

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
}>();

const editorContainerRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);

const editor: any = useEditor({
  extensions: getCommentEditorExtensions(props.placeholder) as Extensions,
  content: '',
  ...defaultCommentEditorConfig,
  onUpdate: ({ editor: editorInstance }) => {
    emit('update:content', editorInstance.getHTML() || '');
  },
  onFocus: () => {
    isFocused.value = true;
  },
  onBlur: () => {
    isFocused.value = false;
  },
});

onMounted(() => {
  nextTick(() => {
    if (!editor.value) return;
    if (props.editContent) {
      editor.value.chain().setContent(props.editContent).run();
    }
  });
});

watch(
  () => props.editContent,
  (newContent) => {
    if (editor.value && newContent !== undefined) {
      const current = editor.value.getHTML();
      const empty = current === '<p></p>' || current === '';
      if (empty || current !== newContent) {
        editor.value.chain().setContent(newContent).run();
      }
    }
  },
);

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
  setContent: (content: string) => editor.value?.chain().setContent(content).run(),
  getEditor: () => editor.value,
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style lang="scss" scoped>
.flow-editor-container {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-color-primary);
}
</style>
