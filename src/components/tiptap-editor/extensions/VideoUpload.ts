/**
 * Tiptap 视频上传扩展
 * 复用现有的上传服务和状态管理
 *
 * 注意：Tiptap 没有内置 Video 节点，需要使用 HTML 方式插入
 */
import { Extension } from '@tiptap/core'
import { uploadVideo } from '@/service/file/file.request'
import useArticleStore from '@/stores/article.store'
import { Msg } from '@/utils'

// 声明命令类型扩展
declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    videoUpload: {
      uploadVideo: (file: File) => ReturnType
    }
  }
}

// 最大文件大小 100MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024

export const VideoUpload = Extension.create({
  name: 'videoUpload',

  addCommands() {
    return {
      uploadVideo:
        (file: File) =>
        ({ editor }) => {
          const articleStore = useArticleStore()

          // 文件大小校验
          if (file.size > MAX_VIDEO_SIZE) {
            Msg.showFail('视频大小不能超过 100MB')
            return false
          }

          console.log('准备上传视频:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB')
          Msg.showInfo('视频上传中，请稍候...')

          uploadVideo(file)
            .then((res: any) => {
              console.log('uploadVideo 接口返回:', res)

              if (res.code === 0) {
                const { id, url, poster } = res.data
                console.log('上传视频成功!', { id, url, poster })

                if (!id) {
                  console.error('警告: 后端返回的数据中没有 id 字段!', res.data)
                  Msg.showFail('视频上传成功，但无法关联到文章（缺少 ID）')
                  return
                }

                // 保存视频ID到待清理列表
                articleStore.addPendingVideoId(id)
                console.log('已保存视频ID到待清理列表:', id)

                // 使用 HTML 方式插入视频
                // 注意：Tiptap 没有内置 Video 节点，通过 insertContent 插入 HTML
                const videoHtml = `<video src="${url}" poster="${poster || ''}" controls style="max-width: 100%; height: auto;"></video>`
                editor.chain().focus().insertContent(videoHtml).run()

                Msg.showSuccess('视频上传成功!')
              } else {
                Msg.showFail(res.message || '视频上传失败')
              }
            })
            .catch((error: any) => {
              console.error('视频上传出错:', error)
              Msg.showFail(error.message || '视频上传失败，请重试')
            })

          return true
        },
    }
  },
})

export default VideoUpload
