<template>
  <div class="comment-toolbar">
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
        <el-button :disabled="!editor" plain class="toolbar-btn dropdown-btn">
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

    <!-- 链接按钮 -->
    <div class="toolbar-group">
      <el-tooltip content="插入链接" placement="bottom" :show-after="500">
        <el-button @click="handleInsertLink" :disabled="!editor" class="toolbar-btn" :type="editor?.isActive('link') ? 'primary' : ''" plain>
          <el-icon><Link /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <el-divider direction="vertical" />

    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <el-tooltip :content="`撤销 (${shortcuts.undo})`" placement="bottom" :show-after="500">
        <el-button plain @click="editor?.chain().focus().undo().run()" :disabled="!editor?.can().undo()" class="toolbar-btn">
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`重做 (${shortcuts.redo})`" placement="bottom" :show-after="500">
        <el-button plain @click="editor?.chain().focus().redo().run()" :disabled="!editor?.can().redo()" class="toolbar-btn">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
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
import { ArrowDown, List, Memo, ChatLineSquare, Coin, Link, RefreshLeft, RefreshRight } from '@element-plus/icons-vue';
import { formatShortcut, commonShortcuts } from '@/utils/keyboard';

import type { Editor } from '@tiptap/vue-3';

const props = defineProps<{
  editor: Editor | undefined;
}>();

// 快捷键显示（根据系统自动适配）
const shortcuts = {
  bold: formatShortcut(commonShortcuts.bold),
  italic: formatShortcut(commonShortcuts.italic),
  underline: formatShortcut(commonShortcuts.underline),
  undo: formatShortcut(commonShortcuts.undo),
  redo: formatShortcut(commonShortcuts.redo),
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
const linkDialogVisible = ref(false);
const linkForm = reactive({
  href: '',
});

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
</script>

<style lang="scss" scoped>
/* 工具栏底部分割线：border-bottom；主色浓淡由祖先的 accentStrength（--ce-strength）控制 */
.comment-toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--el-color-primary) calc(28% * var(--ce-strength, 1)), transparent) transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--el-color-primary) calc(12% * var(--ce-strength, 1)), var(--el-border-color-lighter, var(--el-border-color)));
  background: color-mix(in srgb, var(--el-color-primary) calc(9% * var(--ce-strength, 1)), var(--el-fill-color-blank, var(--bg-color-primary)));

  /* 宽屏：横向溢出时再出现滚动条，样式保持轻量 */
  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--el-color-primary) calc(35% * var(--ce-strength, 1)), transparent);
  }

  .toolbar-group {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
  }

  .toolbar-btn {
    flex-shrink: 0;
    min-width: 32px;
    height: 32px;
    padding: 0 8px;

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

  :deep(.el-divider--vertical) {
    flex-shrink: 0;
    height: 20px;
    margin: 0 4px;
  }

  /* 工具栏按钮：默认幽灵、悬停与激活更清晰 */
  :deep(.toolbar-btn.el-button.is-plain) {
    --el-button-text-color: var(--text-primary, var(--el-text-color-primary));
    --el-button-bg-color: transparent;
    --el-button-border-color: transparent;

    &:hover:not(.is-disabled) {
      --el-button-bg-color: color-mix(in srgb, var(--el-color-primary) calc(14% * var(--ce-strength, 1)), transparent);
      --el-button-text-color: var(--el-color-primary);
    }
  }

  :deep(.toolbar-btn.el-button--primary.is-plain) {
    --el-button-bg-color: color-mix(in srgb, var(--el-color-primary) calc(16% * var(--ce-strength, 1)), transparent);
    --el-button-border-color: color-mix(in srgb, var(--el-color-primary) calc(35% * var(--ce-strength, 1)), transparent);
    --el-button-text-color: var(--el-color-primary);
  }
}

/* 窄屏：横向滚动条默认可见、更细；仅当指针落在滚动条区域时加粗（WebKit） */
@container comment-editor (max-width: 640px) {
  .comment-toolbar {
    overflow-x: scroll;
    padding-bottom: 2px;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--el-color-primary) calc(42% * var(--ce-strength, 1)), transparent)
      color-mix(in srgb, var(--el-color-primary) calc(10% * var(--ce-strength, 1)), transparent);

    &::-webkit-scrollbar {
      -webkit-appearance: none;
      appearance: none;
      height: 3px;
      background: transparent;
    }

    /* 指针落在滚动条轨道/滑块上时加粗（整根 bar 区域） */
    &::-webkit-scrollbar:hover {
      height: 9px;
    }

    &::-webkit-scrollbar-track {
      margin: 0 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--el-color-primary) calc(12% * var(--ce-strength, 1)), transparent);
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: color-mix(in srgb, var(--el-color-primary) calc(38% * var(--ce-strength, 1)), transparent);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--el-color-primary) calc(55% * var(--ce-strength, 1)), transparent);
    }

    &::-webkit-scrollbar-thumb:active {
      background: color-mix(in srgb, var(--el-color-primary) calc(68% * var(--ce-strength, 1)), transparent);
    }

    &::-webkit-scrollbar-corner {
      background: transparent;
    }
  }
}

// 下拉菜单激活状态
:deep(.el-dropdown-menu__item.active) {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
</style>
