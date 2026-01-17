/**
 * Tiptap 编辑器配置
 */
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { Markdown } from '@tiptap/markdown'
import { ImageUpload } from './extensions/ImageUpload'
import { VideoUpload } from './extensions/VideoUpload'

/**
 * 获取 Tiptap 编辑器扩展配置
 */
export const getTiptapExtensions = () => {
  return [
    // 基础功能包（包含常用格式化功能）
    StarterKit.configure({
      // 可以在这里禁用不需要的功能
      // heading: false,
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
  ]
}

/**
 * 编辑器默认配置
 */
export const defaultEditorConfig = {
  autofocus: false,
  editable: true,
}
