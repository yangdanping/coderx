<template>
  <div class="tiptap-toolbar" ref="toolbarRef">
    <!-- 格式化按钮组 -->
    <div class="toolbar-group">
      <el-tooltip :content="`加粗 (${shortcuts.bold})`" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('bold') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleBold().run()" :disabled="!editor" class="toolbar-btn">
          <span class="btn-icon">B</span>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`斜体 (${shortcuts.italic})`" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('italic') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleItalic().run()" :disabled="!editor" class="toolbar-btn">
          <span class="btn-icon italic">I</span>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`下划线 (${shortcuts.underline})`" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('underline') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleUnderline().run()" :disabled="!editor" class="toolbar-btn">
          <span class="btn-icon underline">U</span>
        </el-button>
      </el-tooltip>

      <el-tooltip content="删除线" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('strike') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleStrike().run()" :disabled="!editor" class="toolbar-btn">
          <span class="btn-icon strike">S</span>
        </el-button>
      </el-tooltip>
    </div>

    <el-divider direction="vertical" />

    <!-- 标题下拉 -->
    <div class="toolbar-group">
      <el-dropdown @command="handleHeading" trigger="click">
        <el-button :disabled="!editor" class="toolbar-btn dropdown-btn">
          标题 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="1" :class="{ active: editor?.isActive('heading', { level: 1 }) }">
              <span style="font-size: 24px; font-weight: bold">H1 标题</span>
            </el-dropdown-item>
            <el-dropdown-item command="2" :class="{ active: editor?.isActive('heading', { level: 2 }) }">
              <span style="font-size: 20px; font-weight: bold">H2 标题</span>
            </el-dropdown-item>
            <el-dropdown-item command="3" :class="{ active: editor?.isActive('heading', { level: 3 }) }">
              <span style="font-size: 18px; font-weight: bold">H3 标题</span>
            </el-dropdown-item>
            <el-dropdown-item command="4" :class="{ active: editor?.isActive('heading', { level: 4 }) }">
              <span style="font-size: 16px; font-weight: bold">H4 标题</span>
            </el-dropdown-item>
            <el-dropdown-item command="0" divided>
              <span>正文</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-divider direction="vertical" />

    <!-- 列表按钮组 -->
    <div class="toolbar-group">
      <el-tooltip content="无序列表" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('bulletList') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleBulletList().run()" :disabled="!editor" class="toolbar-btn">
          <el-icon><List /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="有序列表" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('orderedList') ? 'primary' : ''"
          plain
          @click="editor?.chain().focus().toggleOrderedList().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <el-icon><Memo /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="引用块" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('blockquote') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleBlockquote().run()" :disabled="!editor" class="toolbar-btn">
          <el-icon><ChatLineSquare /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="代码块" placement="bottom" :show-after="500">
        <el-button :type="editor?.isActive('codeBlock') ? 'primary' : ''" plain @click="editor?.chain().focus().toggleCodeBlock().run()" :disabled="!editor" class="toolbar-btn">
          <el-icon><Coin /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <el-divider direction="vertical" />

    <!-- 插入按钮组 -->
    <div class="toolbar-group">
      <el-tooltip content="插入链接" placement="bottom" :show-after="500">
        <el-button @click="handleInsertLink" :disabled="!editor" class="toolbar-btn" :type="editor?.isActive('link') ? 'primary' : ''" plain>
          <el-icon><Link /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="插入图片" placement="bottom" :show-after="500">
        <el-button @click="triggerImageUpload" :disabled="!editor" class="toolbar-btn">
          <el-icon><Picture /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="插入视频" placement="bottom" :show-after="500">
        <el-button @click="triggerVideoUpload" :disabled="!editor" class="toolbar-btn">
          <el-icon><VideoCamera /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`AI 助手 (${aiShortcut})`" placement="bottom" :show-after="500">
        <el-button @click="toggleAiAssistant" class="toolbar-btn">
          <el-icon><MagicStick /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 隐藏的文件输入 -->
      <input type="file" ref="imageInputRef" @change="handleImageUpload" accept="image/*" multiple style="display: none" />
      <input type="file" ref="videoInputRef" @change="handleVideoUpload" accept="video/*" style="display: none" />
    </div>

    <el-divider direction="vertical" />

    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <el-tooltip :content="`撤销 (${shortcuts.undo})`" placement="bottom" :show-after="500">
        <el-button @click="editor?.chain().focus().undo().run()" :disabled="!editor?.can().undo()" class="toolbar-btn">
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`重做 (${shortcuts.redo})`" placement="bottom" :show-after="500">
        <el-button @click="editor?.chain().focus().redo().run()" :disabled="!editor?.can().redo()" class="toolbar-btn">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <el-divider direction="vertical" />

    <!-- 模式切换 -->
    <div class="toolbar-group mode-switch">
      <el-tooltip :content="outputMode === 'html' ? '当前：富文本模式' : '当前：Markdown 模式'" placement="bottom" :show-after="500">
        <el-switch :model-value="isMarkdownMode" @change="handleModeChange" active-text="MD" inactive-text="HTML" inline-prompt :width="60" class="plain-switch" />
      </el-tooltip>
    </div>
  </div>

  <!-- 链接弹窗 -->
  <el-dialog v-model="linkDialogVisible" title="插入链接" width="400px" destroy-on-close>
    <el-form :model="linkForm" label-width="60px">
      <el-form-item label="链接">
        <el-input v-model="linkForm.href" placeholder="请输入链接地址" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="linkDialogVisible = false">取消</el-button>
      <el-button type="primary" plain @click="confirmInsertLink">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ArrowDown, List, Memo, ChatLineSquare, Coin, Link, Picture, VideoCamera, RefreshLeft, RefreshRight, MagicStick } from '@element-plus/icons-vue';
import type { Editor } from '@tiptap/vue-3';
import { formatShortcut, commonShortcuts } from '@/utils/keyboard';
import { emitter, getAiShortcutText } from '@/utils';

const props = defineProps<{
  editor: Editor | undefined;
  outputMode: 'html' | 'markdown';
}>();

const emit = defineEmits<{
  (e: 'update:outputMode', mode: 'html' | 'markdown'): void;
}>();

// 快捷键显示（根据系统自动适配）
const shortcuts = {
  bold: formatShortcut(commonShortcuts.bold),
  italic: formatShortcut(commonShortcuts.italic),
  underline: formatShortcut(commonShortcuts.underline),
  undo: formatShortcut(commonShortcuts.undo),
  redo: formatShortcut(commonShortcuts.redo),
};

// 响应式状态
const toolbarRef = ref<HTMLElement>();
const imageInputRef = ref<HTMLInputElement>();
const videoInputRef = ref<HTMLInputElement>();
const linkDialogVisible = ref(false);
const linkForm = reactive({
  href: '',
});

// AI 助手快捷键提示（从全局 utils 获取，根据系统自动适配）
const aiShortcut = getAiShortcutText();

// 模式切换
const isMarkdownMode = computed(() => props.outputMode === 'markdown');

const handleModeChange = (val: boolean | string | number) => {
  const newMode = val ? 'markdown' : 'html';
  console.log('[DEBUG] TiptapToolbar - 模式切换触发:', { val, newMode });
  emit('update:outputMode', newMode);
};

// 标题处理
const handleHeading = (level: string) => {
  const lvl = parseInt(level);
  if (lvl === 0) {
    props.editor?.chain().focus().setParagraph().run();
  } else {
    props.editor
      ?.chain()
      .focus()
      .toggleHeading({ level: lvl as 1 | 2 | 3 | 4 | 5 | 6 })
      .run();
  }
};

// 链接处理
const handleInsertLink = () => {
  // 如果已有链接，获取当前链接地址
  const previousUrl = props.editor?.getAttributes('link').href;
  linkForm.href = previousUrl || '';
  linkDialogVisible.value = true;
};

const confirmInsertLink = () => {
  if (linkForm.href) {
    props.editor?.chain().focus().extendMarkRange('link').setLink({ href: linkForm.href }).run();
  } else {
    props.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
  }
  linkDialogVisible.value = false;
  linkForm.href = '';
};

// 图片上传
const triggerImageUpload = () => {
  imageInputRef.value?.click();
};

const handleImageUpload = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length > 0 && props.editor) {
    // 串行上传所有图片，确保按顺序插入
    for (const file of Array.from(files)) {
      props.editor.commands.uploadImage(file);
      // 等待当前图片上传完成
      const storage = props.editor.storage as { imageUpload?: { getUploadPromise?: (file: File) => Promise<void> } };
      const promise = storage?.imageUpload?.getUploadPromise?.(file);
      if (promise) {
        await promise;
      }
    }
  }
  // 清空 input，允许重复选择同一文件
  if (imageInputRef.value) {
    imageInputRef.value.value = '';
  }
};

// 视频上传
const triggerVideoUpload = () => {
  videoInputRef.value?.click();
};

const handleVideoUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file && props.editor) {
    // 使用自定义命令上传视频
    props.editor.commands.uploadVideo(file);
  }
  // 清空 input
  if (videoInputRef.value) {
    videoInputRef.value.value = '';
  }
};

// AI 助手
const toggleAiAssistant = () => {
  emitter.emit('toggleAiAssistant');
};
</script>

<style lang="scss" scoped>
.tiptap-toolbar {
  display: flex;
  flex-wrap: wrap; // 关键：窗口变窄时自动换行
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  @include thin-border(bottom, var(--el-border-color));
  background: var(--bg-secondary);

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;

    // 移动端优化：增大触摸区域
    @media (max-width: 768px) {
      min-width: 44px;
      height: 44px;
      padding: 0 10px;
    }

    .btn-icon {
      font-weight: bold;
      font-size: 14px;
      font-family: serif;

      &.italic {
        font-style: italic;
      }

      &.underline {
        text-decoration: underline;
      }

      &.strike {
        text-decoration: line-through;
      }
    }
  }

  .dropdown-btn {
    min-width: auto;
    padding: 0 12px;
  }

  .mode-switch {
    margin-left: auto; // 推到右侧

    // 确保 switch 宽度固定，避免切换模式时抖动
    :deep(.el-switch) {
      width: 60px;

      &.plain-switch {
        --el-switch-on-color: var(--el-color-success-light-8);
        --el-switch-off-color: var(--el-color-primary-light-8);

        .el-switch__inner {
          .is-text {
            color: var(--el-text-color-primary);
            font-weight: bold;
          }
        }

        &.is-checked {
          .el-switch__inner {
            .is-text {
              color: var(--el-color-success);
            }
          }
        }

        &:not(.is-checked) {
          .el-switch__inner {
            .is-text {
              color: var(--el-color-primary);
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      margin-left: 0;
      width: 100%;
      justify-content: flex-end;
      margin-top: 4px;
    }
  }

  // 分隔符在换行时隐藏
  :deep(.el-divider--vertical) {
    height: 20px;
    margin: 0 8px;

    @media (max-width: 768px) {
      display: none;
    }
  }
}

// 下拉菜单激活状态
:deep(.el-dropdown-menu__item.active) {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
</style>
