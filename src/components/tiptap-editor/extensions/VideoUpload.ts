/**
 * Tiptap 视频上传扩展
 *
 * 关键链路：
 * 1. 同步校验（类型 / 大小 / 数量）
 * 2. 异步 magic number 预检（mp4/mov/webm），明显无效的文件直接拒绝，省一次后端失败请求
 * 3. 触发上传；收到后端 `code === 0` 即插入节点 + 显示"上传成功"（UX 原则：不让用户感受到处理耗时）
 * 4. 静默轮询 `GET /video/:id` 取真实 transcode_status：
 *    - completed：只刷 poster 属性，不打扰用户
 *    - failed：告警 + 删节点 + 清 pending id
 *    - timeout/processing：不打扰，保留节点
 */
import { Extension } from '@tiptap/core';
import { uploadVideo } from '@/service/file/file.request';
import useEditorStore from '@/stores/editor.store';
import { Msg } from '@/utils';
import {
  getVideoMagicNumberMismatchMessage,
  getVideoValidationMessage,
  MAX_VIDEO_COUNT,
  VIDEO_COUNT_LIMIT_MESSAGE,
} from '../uploadLimits';
import { DEFAULT_VIDEO_STYLE } from './VideoNode';
import {
  pollTranscodeStatus,
  refreshVideoNodePoster,
  removeVideoNodeById,
} from './videoTranscodeUtils';

import type { EditorJsonNode, VideoNodeAttrs } from './types';
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

          // 剩余流程（magic number 预检 + 上传 + 静默轮询）全部走异步，
          // tiptap command 必须同步返回 boolean，因此在此之后立即 `return true`
          void (async () => {
            const magicMismatch = await getVideoMagicNumberMismatchMessage(file);
            if (magicMismatch) {
              Msg.showFail(magicMismatch);
              return;
            }

            Msg.showInfo('视频上传中，请稍候...');

            let uploadRes: IUploadVideoResponse;
            try {
              uploadRes = (await uploadVideo(file)) as IUploadVideoResponse;
            } catch (error: unknown) {
              console.error('视频上传出错:', error);
              Msg.showFail('视频上传失败，请重试');
              return;
            }

            console.log('uploadVideo 接口返回:', uploadRes);

            if (uploadRes?.code !== 0) {
              Msg.showFail(uploadRes?.msg || uploadRes?.message || '视频上传失败');
              return;
            }

            const { id, url, poster } = uploadRes.data;
            console.log('上传视频成功!', { id, url, poster });

            if (!id) {
              console.error('警告: 后端返回的数据中没有 id 字段!', uploadRes.data);
              Msg.showFail('视频上传成功，但无法关联到文章（缺少 ID）');
              return;
            }

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

            // 静默轮询真实转码状态；用户对速度无感知变化
            pollTranscodeStatus(id, { intervalMs: 2000, timeoutMs: 60_000 })
              .then((result) => {
                if (result.outcome === 'completed') {
                  // 不弹 toast（避免打扰），仅把 poster 刷成真实可访问的 URL
                  if (result.poster) {
                    refreshVideoNodePoster(editor, id, result.poster);
                  }
                } else if (result.outcome === 'failed') {
                  Msg.showFail('视频处理失败（可能文件损坏），请重新上传');
                  removeVideoNodeById(editor, id);
                  editorStore.removePendingVideoId(id);
                }
                // 'timeout' / 'missing' / 'pending' / 'processing' 不打扰用户，保留节点继续编辑
              })
              .catch((error) => {
                console.warn(`[VideoUpload] 轮询 videoId=${id} 状态时出错:`, error);
              });
          })();

          return true;
        },
    };
  },
});

export default VideoUpload;
