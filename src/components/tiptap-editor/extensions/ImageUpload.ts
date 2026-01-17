/**
 * Tiptap 图片上传扩展
 * 复用现有的上传服务和状态管理
 */
import { Extension } from '@tiptap/core'
import { uploadImg } from '@/service/file/file.request'
import useArticleStore from '@/stores/article.store'
import { Msg } from '@/utils'

// 声明命令类型扩展
declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    imageUpload: {
      uploadImage: (file: File) => ReturnType
    }
  }
}

// 存储上传 Promise 的 Map，用于串行上传等待
const uploadPromises = new Map<File, Promise<void>>()

export const ImageUpload = Extension.create({
  name: 'imageUpload',

  addCommands() {
    return {
      uploadImage:
        (file: File) =>
        ({ editor }) => {
          const articleStore = useArticleStore()

          // 显示上传提示
          Msg.showInfo('图片上传中...')

          // 创建并存储 Promise
          const promise = uploadImg(file)
            .then((res) => {
              if (res.code === 0) {
                const url = res.data[0].url
                const imgId = res.data[0].result.insertId
                console.log('Tiptap 图片上传成功:', url, imgId)

                // 添加到待清理列表（用于刷新时清理孤儿图片）
                articleStore.addPendingImageId(imgId)

                // 插入图片到编辑器
                editor.chain().setImage({ src: url, alt: '' }).run()
                // 将光标移动到文档末尾，确保下一张图片在后面插入
                editor.commands.focus('end')
                Msg.showSuccess('图片上传成功')
              } else {
                Msg.showFail('图片上传失败')
              }
            })
            .catch((error) => {
              console.error('图片上传出错:', error)
              Msg.showFail('图片上传失败，请重试')
            })
            .finally(() => {
              uploadPromises.delete(file)
            })

          uploadPromises.set(file, promise)
          return true
        },
    }
  },

  // 添加 storage，用于外部获取上传 Promise 实现串行上传
  addStorage() {
    return {
      getUploadPromise: (file: File) => uploadPromises.get(file),
    }
  },
})

export default ImageUpload
