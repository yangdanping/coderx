/**
 * Tiptap 视频上传扩展
 * 复用现有的上传服务和状态管理
 */
import { Extension } from '@tiptap/core';
import { uploadVideo } from '@/service/file/file.request';
import useEditorStore from '@/stores/editor.store';
import { Msg } from '@/utils';
import { getVideoValidationMessage, MAX_VIDEO_COUNT, VIDEO_COUNT_LIMIT_MESSAGE } from '../uploadLimits';
import { DEFAULT_VIDEO_STYLE } from './VideoNode';

import type { EditorJsonNode, VideoNodeAttrs } from '../types';
import type { IUploadVideoResponse, UploadVideoOptions } from '../types/video-upload.type';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoUpload: {
      uploadVideo: (file: File, options?: UploadVideoOptions) => ReturnType;
    };
  }
}

const countVideoNodes = (node?: EditorJsonNode): number => {
  if (!node) return 0;

  let count = node.type === 'video' ? 1 : 0;
  if (node.content?.length) {
    for (const child of node.content) {
      count += countVideoNodes(child);
    }
  }

  return count;
};

export const VideoUpload = Extension.create({
  name: 'videoUpload',

  addCommands() {
    return {
      uploadVideo:
        (file: File, options?: UploadVideoOptions) =>
        ({ editor }) => {
          const editorStore = useEditorStore();

          // 数量限制校验
          const currentDoc = editor.getJSON() as EditorJsonNode;
          const videoCount = countVideoNodes(currentDoc);
          if (videoCount >= MAX_VIDEO_COUNT) {
            Msg.showInfo(VIDEO_COUNT_LIMIT_MESSAGE);
            return false;
          }

          const validationMessage = getVideoValidationMessage(file);
          if (validationMessage) {
            Msg.showInfo(validationMessage);
            return false;
          }

          console.log('准备上传视频:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
          Msg.showInfo('视频上传中，请稍候...');

          uploadVideo(file)
            .then((res: IUploadVideoResponse) => {
              console.log('uploadVideo 接口返回:', res);

              if (res.code === 0) {
                const { id, url, poster } = res.data;
                console.log('上传视频成功!', { id, url, poster });

                if (!id) {
                  console.error('警告: 后端返回的数据中没有 id 字段!', res.data);
                  Msg.showFail('视频上传成功，但无法关联到文章（缺少 ID）');
                  return;
                }

                // 保存视频ID到待清理列表
                editorStore.addPendingVideoId(id);
                editorStore.registerVideoMeta({
                  videoId: id,
                  src: url,
                  poster: poster || null,
                  controls: true,
                  style: DEFAULT_VIDEO_STYLE,
                });
                console.log('已保存视频ID到待清理列表:', id);

                const chain = editor.chain();
                if (options?.insertSelection) {
                  chain.focus();
                  chain.setTextSelection(options.insertSelection);
                } else if (editor.isFocused) {
                  chain.focus();
                } else {
                  chain.focus('end');
                }
                chain
                  .insertContent({
                    type: 'video',
                    attrs: {
                      videoId: id,
                      src: url,
                      poster: poster || null,
                      controls: true,
                      style: DEFAULT_VIDEO_STYLE,
                    } as VideoNodeAttrs,
                  })
                  .run();

                Msg.showSuccess('视频上传成功!');
              } else {
                Msg.showFail(res.message || '视频上传失败');
              }
            })
            .catch((error: unknown) => {
              console.error('视频上传出错:', error);
              const message = error instanceof Error ? error.message : '视频上传失败，请重试';
              Msg.showFail(message);
            });

          return true;
        },
    };
  },
});

export default VideoUpload;
