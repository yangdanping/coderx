/**
 * Tiptap 评论编辑器配置
 * 包含基础富文本功能，不含图片/视频上传、AI补全、Markdown
 */
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

// 创建 lowlight 实例，使用常用语言包
const lowlight = createLowlight(common)

/**
 * 获取评论编辑器扩展配置
 */
export const getCommentEditorExtensions = (placeholder?: string) => {
  return [
    // 基础功能包（包含常用格式化功能）
    StarterKit.configure({
      // 禁用默认 codeBlock，使用 CodeBlockLowlight 替代
      codeBlock: false,
    }),

    // 代码块高亮扩展
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
      languageClassPrefix: 'language-',
    }),

    // 链接扩展
    Link.configure({
      openOnClick: false, // 编辑模式下不自动打开链接
      autolink: true, // 自动识别链接
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),

    // 占位符
    Placeholder.configure({
      placeholder: placeholder || '请输入评论内容...',
    }),

    // 下划线
    Underline,
  ]
}

/**
 * 编辑器默认配置
 */
export const defaultCommentEditorConfig = {
  autofocus: false,
  editable: true,
}
