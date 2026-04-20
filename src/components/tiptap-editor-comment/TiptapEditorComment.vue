<template>
  <div class="comment-editor-container" ref="editorContainerRef" :style="accentVars">
    <!-- 工具栏（默认收起，由右下角 toggle 控制；偏好持久化到 localStorage） -->
    <CommentToolbar v-if="showToolbar" :editor="editor" />

    <!-- 编辑区域 -->
    <EditorContent :editor="editor" class="comment-editor-content" :class="{ 'is-focused': isFocused }" />

    <!-- 底部工具条：左侧 toggle（Aa）/ 右侧业务侧按钮（取消、回复、发送等） -->
    <div class="comment-editor-footer">
      <el-tooltip :content="showToolbar ? '隐藏格式化工具栏' : '显示格式化工具栏'" placement="top" :show-after="400">
        <button
          type="button"
          class="toolbar-toggle"
          :class="{ 'is-active': showToolbar }"
          :aria-pressed="showToolbar"
          aria-label="切换格式化工具栏"
          @click="toggleToolbar"
        >
          <span class="toolbar-toggle__icon">Aa</span>
        </button>
      </el-tooltip>

      <div class="comment-editor-actions">
        <slot name="actions" />
      </div>
    </div>

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

/*
 * ======== 工具栏显示偏好 ========
 * 参考 Reddit 评论框交互：默认收起（降噪），用户点右下角的 "Aa" 切换，
 * 选择按 localStorage 持久化，同一终端跨页面、跨刷新保持一致。
 * SSR / 非浏览器环境读 localStorage 会抛错，这里做容错兜底。
 */
const TOOLBAR_PREF_KEY = 'comment-editor:show-toolbar';

const readToolbarPref = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TOOLBAR_PREF_KEY) === '1';
  } catch {
    return false;
  }
};

const showToolbar = ref(readToolbarPref());

const toggleToolbar = () => {
  showToolbar.value = !showToolbar.value;
  try {
    window.localStorage.setItem(TOOLBAR_PREF_KEY, showToolbar.value ? '1' : '0');
  } catch {
    // 存储不可用时（隐私模式等）仅内存态生效，不影响主流程
  }
};

/*
 * ======== 编辑区高度偏好 ========
 * 参考 Reddit 评论框：用户可以按住编辑区右下角的手柄（由 CSS `resize: vertical` 提供）
 * 拖拽调整默认高度；新的高度通过 ResizeObserver 回写 localStorage，
 * 下次打开同一终端会自动恢复，保证"调一次，长期生效"。
 *
 * 允许范围由 comment-editor.scss 中的 min-height / max-height 约束，这里只做读写与防御。
 */
const HEIGHT_PREF_KEY = 'comment-editor:content-height';
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;

const readHeightPref = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HEIGHT_PREF_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= MIN_HEIGHT && n <= MAX_HEIGHT ? n : null;
  } catch {
    return null;
  }
};

let heightPersistTimer: number | undefined;
const persistHeight = (h: number) => {
  if (typeof window === 'undefined') return;
  window.clearTimeout(heightPersistTimer);
  heightPersistTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(HEIGHT_PREF_KEY, String(h));
    } catch {
      // 忽略不可写入场景（隐私模式等）
    }
  }, 200);
};

let heightResizeObserver: ResizeObserver | null = null;

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

  // 恢复上次保存的编辑区高度，并观察后续用户拖拽调整
  nextTick(() => {
    const contentEl = editorContainerRef.value?.querySelector<HTMLElement>('.comment-editor-content');
    if (!contentEl) return;

    const saved = readHeightPref();
    if (saved != null) contentEl.style.height = `${saved}px`;

    let lastPersisted = saved ?? Math.round(contentEl.getBoundingClientRect().height);
    heightResizeObserver = new ResizeObserver(() => {
      const h = Math.round(contentEl.getBoundingClientRect().height);
      if (h === lastPersisted) return;
      // 超界值直接丢弃：CSS 已经用 min/max 兜住，这里是双保险
      if (h < MIN_HEIGHT || h > MAX_HEIGHT) return;
      lastPersisted = h;
      persistHeight(h);
    });
    heightResizeObserver.observe(contentEl);
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
  heightResizeObserver?.disconnect();
  heightResizeObserver = null;
  if (heightPersistTimer != null) {
    window.clearTimeout(heightPersistTimer);
    heightPersistTimer = undefined;
  }
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

/*
 * 编辑器底部工具条：
 * - 左侧：格式化工具栏的 toggle 按钮（"Aa"），控制 CommentToolbar 的展示
 * - 右侧：外部通过 #actions slot 传入的业务按钮（取消 / 回复 / 发送 等）
 * 把这两类动作归拢到同一条底栏，避免外层再用 absolute 定位把按钮悬浮在编辑区上面。
 */
.comment-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid color-mix(in srgb, var(--el-color-primary) calc(10% * var(--ce-strength, 1)), var(--el-border-color-lighter, var(--el-border-color)));
  background: color-mix(in srgb, var(--el-color-primary) calc(3% * var(--ce-strength, 1)), var(--el-bg-color, #fff));
}

.toolbar-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--el-color-primary) calc(12% * var(--ce-strength, 1)), transparent);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--el-color-primary) calc(35% * var(--ce-strength, 1)), var(--el-border-color));
  }

  &.is-active {
    background: color-mix(in srgb, var(--el-color-primary) calc(18% * var(--ce-strength, 1)), transparent);
    color: var(--el-color-primary);
  }

  .toolbar-toggle__icon {
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.5px;
    // 让 "A" 稍大一点、"a" 稍小，贴近"格式化"语义
    background: linear-gradient(180deg, currentColor 50%, currentColor 50%);
    -webkit-background-clip: text;
    background-clip: text;
  }
}

.comment-editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;

  // slot 为空时把左侧 toggle 自然挤回左边即可；
  // slot 有内容时按钮组紧贴右边
  &:empty {
    display: none;
  }
}
</style>
