<template>
  <div class="comment-toolbar">
    <!-- 格式化按钮组 -->
    <div class="toolbar-group">
      <el-tooltip :content="`加粗 (${shortcuts.bold})`" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('bold') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleBold().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <span class="btn-icon">B</span>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`斜体 (${shortcuts.italic})`" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('italic') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleItalic().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <span class="btn-icon italic">I</span>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`下划线 (${shortcuts.underline})`" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('underline') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleUnderline().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <span class="btn-icon underline">U</span>
        </el-button>
      </el-tooltip>

      <el-tooltip content="删除线" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('strike') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleStrike().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
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
        <el-button
          :type="editor?.isActive('bulletList') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleBulletList().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <el-icon><List /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="有序列表" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('orderedList') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleOrderedList().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <el-icon><Memo /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="引用块" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('blockquote') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleBlockquote().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <el-icon><ChatLineSquare /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="代码块" placement="bottom" :show-after="500">
        <el-button
          :type="editor?.isActive('codeBlock') ? 'primary' : ''"
          @click="editor?.chain().focus().toggleCodeBlock().run()"
          :disabled="!editor"
          class="toolbar-btn"
        >
          <el-icon><Coin /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <el-divider direction="vertical" />

    <!-- 链接按钮 -->
    <div class="toolbar-group">
      <el-tooltip content="插入链接" placement="bottom" :show-after="500">
        <el-button
          @click="handleInsertLink"
          :disabled="!editor"
          class="toolbar-btn"
          :type="editor?.isActive('link') ? 'primary' : ''"
        >
          <el-icon><Link /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <el-divider direction="vertical" />

    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <el-tooltip :content="`撤销 (${shortcuts.undo})`" placement="bottom" :show-after="500">
        <el-button
          @click="editor?.chain().focus().undo().run()"
          :disabled="!editor?.can().undo()"
          class="toolbar-btn"
        >
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="`重做 (${shortcuts.redo})`" placement="bottom" :show-after="500">
        <el-button
          @click="editor?.chain().focus().redo().run()"
          :disabled="!editor?.can().redo()"
          class="toolbar-btn"
        >
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
      <el-button type="primary" @click="confirmInsertLink">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ArrowDown, List, Memo, ChatLineSquare, Coin, Link, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import type { Editor } from '@tiptap/vue-3'
import { formatShortcut, commonShortcuts } from '@/utils/keyboard'

const props = defineProps<{
  editor: Editor | undefined
}>()

// 快捷键显示（根据系统自动适配）
const shortcuts = {
  bold: formatShortcut(commonShortcuts.bold),
  italic: formatShortcut(commonShortcuts.italic),
  underline: formatShortcut(commonShortcuts.underline),
  undo: formatShortcut(commonShortcuts.undo),
  redo: formatShortcut(commonShortcuts.redo),
}

// 标题处理
const handleHeading = (level: string) => {
  const lvl = parseInt(level)
  if (lvl === 0) {
    props.editor?.chain().focus().setParagraph().run()
  } else {
    props.editor
      ?.chain()
      .focus()
      .toggleHeading({ level: lvl as 1 | 2 | 3 | 4 | 5 | 6 })
      .run()
  }
}

// 链接处理
const linkDialogVisible = ref(false)
const linkForm = reactive({
  href: '',
})

const handleInsertLink = () => {
  // 如果已有链接，获取当前链接地址
  const previousUrl = props.editor?.getAttributes('link').href
  linkForm.href = previousUrl || ''
  linkDialogVisible.value = true
}

const confirmInsertLink = () => {
  if (linkForm.href) {
    props.editor?.chain().focus().extendMarkRange('link').setLink({ href: linkForm.href }).run()
  } else {
    props.editor?.chain().focus().extendMarkRange('link').unsetLink().run()
  }
  linkDialogVisible.value = false
  linkForm.href = ''
}
</script>

<style lang="scss" scoped>
.comment-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  background: #fafafa;

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar-btn {
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
    height: 20px;
    margin: 0 8px;
  }
}

// 下拉菜单激活状态
:deep(.el-dropdown-menu__item.active) {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
</style>
