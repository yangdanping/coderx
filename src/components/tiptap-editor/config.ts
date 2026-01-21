/**
 * Tiptap 编辑器配置
 */
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { Markdown } from '@tiptap/markdown'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { ImageUpload } from './extensions/ImageUpload'
import { VideoUpload } from './extensions/VideoUpload'
import { AiCompletion } from './extensions/AiCompletion'

// 创建 lowlight 实例，使用常用语言包
const lowlight = createLowlight(common)

/**
 * 获取 Tiptap 编辑器扩展配置
 */
export const getTiptapExtensions = () => {
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

    // Markdown 支持
    Markdown.configure({
      // 配置 Markdown 转换选项
      markedOptions: {
        gfm: true, // 启用 GitHub Flavored Markdown
        breaks: true, // 换行符转为 <br>
      },
    }),

    // 图片扩展
    // inline: true 使图片成为内联元素，可以与其他图片横向排列
    // 这样保证了编辑器回显与详情页显示一致
    Image.configure({
      inline: true,
      allowBase64: false,
      HTMLAttributes: {
        class: 'tiptap-image',
      },
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
      placeholder: '请输入内容...',
    }),

    // 下划线
    Underline,

    // 自定义扩展：图片上传
    ImageUpload,

    // 自定义扩展：视频上传
    VideoUpload,

    // 自定义扩展：AI 编辑补全
    AiCompletion.configure({
      debounceMs: 500, // 防抖 500ms
      minTriggerLength: 10, // 最少 10 个字符触发
      contextWindow: 500, // 上下文窗口 500 字
      maxSuggestions: 3, // 最多 3 个建议
    }),
  ]
}

/**
 * 编辑器默认配置
 */
export const defaultEditorConfig = {
  autofocus: false,
  editable: true,
}
