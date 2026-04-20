<template>
  <div class="comment-editor-container" ref="editorContainerRef" :style="accentVars">
    <!-- 工具栏 -->
    <CommentToolbar :editor="editor" />

    <!-- 编辑区域 -->
    <EditorContent :editor="editor" class="comment-editor-content" :class="{ 'is-focused': isFocused }" />

    <!-- BubbleMenu：选中文字时显示 -->
    <BubbleMenu :editor="editor as any" :tippy-options="{ duration: 100 }" v-if="editor" class="comment-bubble-menu">
      <el-button size="small" :type="editor.isActive('bold') ? 'primary' : ''" @click="editor.chain().focus().toggleBold().run()"> 加粗 </el-button>
      <el-button size="small" :type="editor.isActive('italic') ? 'primary' : ''" @click="editor.chain().focus().toggleItalic().run()"> 斜体 </el-button>
      <el-button size="small" :type="editor.isActive('link') ? 'primary' : ''" @click="handleBubbleLink"> 链接 </el-button>
    </BubbleMenu>
  </div>
</template>

<script lang="ts" setup>
import { useEditor, EditorContent } from '@tiptap/vue-3';
// Tiptap v3.x 中 BubbleMenu 需要从 /menus 子路径导入
import { BubbleMenu } from '@tiptap/vue-3/menus';
import CommentToolbar from './CommentToolbar.vue';
import { getCommentEditorExtensions, defaultCommentEditorConfig } from './config';
import { emitter } from '@/utils';

// 引入样式
import './styles/comment-editor.scss';
import type { Extensions } from '@tiptap/core';

const props = withDefaults(
  defineProps<{
    editComment?: string;
    placeholder?: string;
    height?: string | number;
    /**
     * 评论框主色叠加强度（0–100）。越大则边框/工具栏/正文底上的主题蓝越明显；0 接近中性色。
     * 与下方样式中的 `calc(…% * var(--ce-strength))` 联动，可在不改组件代码的情况下调外观。
     */
    accentStrength?: number;
  }>(),
  {
    editComment: '',
    placeholder: '请输入评论内容...',
    height: 'auto',
    accentStrength: 30,
  },
);

/** 0–1，供子节点用 `calc(N% * var(--ce-strength))` 统一调色 */
const accentVars = computed(() => {
  const raw = props.accentStrength ?? 50;
  const s = Math.min(100, Math.max(0, raw)) / 100;
  return { '--ce-strength': String(s) } as Record<string, string>;
});

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
}>();

// 编辑器容器引用
const editorContainerRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);

// 创建编辑器实例
const editor: any = useEditor({
  extensions: getCommentEditorExtensions(props.placeholder) as Extensions,
  content: '',
  ...defaultCommentEditorConfig,
  onUpdate: ({ editor: editorInstance }) => {
    const content = editorInstance.getHTML();
    emit('update:content', content || '');
  },
  onFocus: () => {
    isFocused.value = true;
  },
  onBlur: () => {
    isFocused.value = false;
  },
});

// 初始化内容
onMounted(() => {
  nextTick(() => {
    if (!editor.value) return;

    // 如果有编辑内容，设置到编辑器
    if (props.editComment) {
      editor.value.chain().setContent(props.editComment).run();
    }
  });
});

// 监听 editComment 变化（编辑模式）
watch(
  () => props.editComment,
  (newContent) => {
    if (editor.value && newContent) {
      const currentContent = editor.value.getHTML();
      // 避免重复设置相同内容
      const isEmpty = currentContent === '<p></p>' || currentContent === '';
      if (isEmpty || currentContent !== newContent) {
        editor.value.chain().setContent(newContent).run();
      }
    }
  },
  { immediate: true },
);

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

// 暴露方法供外部调用
defineExpose({
  // 获取 HTML 内容
  getHTML: () => editor.value?.getHTML() ?? '',
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
/*
 * 边框与形状（自己改这里即可）：
 * - 本块：整框描边 border、圆角 border-radius、聚焦环 :focus-within
 * - 工具栏与编辑区分割线：CommentToolbar.vue → .comment-toolbar → border-bottom
 * - 正文区域底色：styles/comment-editor.scss → .comment-editor-content
 * 主色「浓淡」由 props accentStrength（--ce-strength）与各处的 calc(…% * var(--ce-strength)) 控制。
 */
.comment-editor-container {
  /* 无 :style 绑定兜底，与 accentStrength 默认 50 一致 */
  --ce-strength: 0.5;
  container-type: inline-size;
  container-name: comment-editor;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) calc(14% * var(--ce-strength, 1)), var(--el-border-color-lighter, var(--el-border-color)));
  overflow: hidden;
  background: color-mix(in srgb, var(--el-color-primary) calc(5% * var(--ce-strength, 1)), var(--bg-color-primary));
  box-shadow: 0 1px 0 color-mix(in srgb, var(--el-color-primary) calc(6% * var(--ce-strength, 1)), transparent);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  // &:focus-within {
  //   border-color: color-mix(in srgb, var(--el-color-primary) calc(38% * var(--ce-strength, 1)), var(--el-border-color));
  //   box-shadow:
  //     0 0 0 3px color-mix(in srgb, var(--el-color-primary) calc(20% * var(--ce-strength, 1)), transparent),
  //     0 1px 0 color-mix(in srgb, var(--el-color-primary) calc(10% * var(--ce-strength, 1)), transparent);
  // }
}
</style>
