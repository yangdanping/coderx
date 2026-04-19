/**
 * Tiptap 图片上传扩展
 * 复用现有的上传服务和状态管理
 */
import { Extension } from '@tiptap/core';
import { uploadImg } from '@/service/file/file.request';
import useEditorStore from '@/stores/editor.store';
import { Msg } from '@/utils';
import { getImageValidationMessage } from '../uploadLimits';
import type { ImageUploadCommandOptions } from '../types/upload.type';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageUpload: {
      uploadImage: (file: File, options?: ImageUploadCommandOptions) => ReturnType;
    };
  }
}

// 存储上传 Promise 的 Map，用于串行上传等待
const uploadPromises = new Map<File, Promise<void>>();

export const ImageUpload = Extension.create({
  name: 'imageUpload',

  addCommands() {
    return {
      uploadImage:
        (file: File, options?: ImageUploadCommandOptions) =>
        ({ editor }) => {
          const editorStore = useEditorStore();
          const validationMessage = getImageValidationMessage(file);

          if (validationMessage) {
            Msg.showInfo(validationMessage);
            return false;
          }

          // 显示上传提示
          Msg.showInfo('图片上传中...');

          // 创建并存储 Promise
          const promise = uploadImg(file)
            .then((res) => {
              if (res.code === 0) {
                const url = res.data[0].url;
                const imgId = res.data[0].result.insertId;
                console.log('Tiptap 图片上传成功:', url, imgId);

                // 添加到待清理列表（用于刷新时清理孤儿图片）
                editorStore.addPendingImageId(imgId);

                if (options?.onUploaded) {
                  options.onUploaded({
                    url,
                    imgId,
                  });
                  Msg.showSuccess('图片上传成功');
                  return;
                }

                const chain = editor.chain();
                if (options?.insertSelection) {
                  chain.focus();
                  chain.setTextSelection(options.insertSelection);
                } else if (editor.isFocused) {
                  chain.focus();
                } else {
                  // 分栏/失焦场景下不要信任旧选区，直接追加到文末
                  chain.focus('end');
                }

                chain
                  .insertContent({
                    type: 'image',
                    attrs: {
                      imageId: imgId,
                      src: url,
                      alt: '',
                    },
                  })
                  .run();
                Msg.showSuccess('图片上传成功');
              } else {
                Msg.showFail('图片上传失败');
              }
            })
            .catch((error) => {
              console.error('图片上传出错:', error);
              Msg.showFail('图片上传失败，请重试');
            })
            .finally(() => {
              uploadPromises.delete(file);
            });

          uploadPromises.set(file, promise);
          return true;
        },
    };
  },

  // 添加 storage，用于外部获取上传 Promise 实现串行上传
  addStorage() {
    return {
      getUploadPromise: (file: File) => uploadPromises.get(file),
    };
  },
});

export default ImageUpload;
