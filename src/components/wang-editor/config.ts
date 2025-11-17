import { uploadImg, uploadVideo } from '@/service/file/file.request';
import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import { Msg } from '@/utils';
import useArticleStore from '@/stores/article.store';

import type { IToolbarConfig, IEditorConfig } from '@wangeditor/editor';
type InsertFnType = (url: string, alt: string, href: string) => void;
type VideoInsertFnType = (url: string, poster?: string) => void;

export const useEditorConfig = () => {
  const articleStore = useArticleStore();

  // 配置
  const toolbarConfig: Partial<IToolbarConfig & any> = {};
  const editorConfig: Partial<IEditorConfig & any> = {
    placeholder: '请输入内容...',
    MENU_CONF: {
      // 图片上传配置
      uploadImage: {
        // 自定义上传
        async customUpload(file: File, insertFn: InsertFnType) {
          // file 即选中的文件
          // 自己实现上传,并得到图片 url alt href,最后插入图片
          const res = await uploadImg(file);
          if (res.code === 0) {
            const url = res.data[0].url;
            const imgId = res.data[0].result.insertId;
            console.log('图片上传成功:', url, imgId);
            // 添加到待清理列表（用于刷新时清理孤儿图片）
            articleStore.addPendingImageId(imgId);
            // 直接插入图片到编辑器，不再处理封面逻辑
            insertFn(url, '', url);
          } else {
            Msg.showFail('图片上传失败');
          }
        },
      },

      // 视频上传配置
      // uploadVideo: {
      //   // 最大文件大小 (100MB)
      //   maxFileSize: 100 * 1024 * 1024,
      //   // 最多上传1个视频
      //   maxNumberOfFiles: 1,
      //   // 文件类型限制
      //   allowedFileTypes: ['video/*'],

      //   // 自定义上传
      //   async customUpload(file: File, insertFn: VideoInsertFnType) {
      //     console.log('准备上传视频:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      //     // 文件大小校验
      //     if (file.size > 100 * 1024 * 1024) {
      //       Msg.showFail('视频大小不能超过 100MB');
      //       return;
      //     }

      //     // 显示上传提示
      //     Msg.showInfo('视频上传中,请稍候...');

      //     try {
      //       const res: any = await uploadVideo(file);
      //       console.log('uploadVideo 接口返回:', res);

      //       if (res.code === 0) {
      //         const { id, url, poster, filename } = res.data;
      //         console.log('上传视频成功!', { id, url, poster, filename });

      //         if (!id) {
      //           console.error('警告: 后端返回的数据中没有 id 字段!', res.data);
      //           Msg.showFail('视频上传成功,但无法关联到文章(缺少 ID)');
      //           return;
      //         }

      //         // 保存视频ID到store
      //         articleStore.updateUploadedVideos(id);
      //         console.log('已保存视频ID到store:', id);

      //         // 插入视频到编辑器
      //         insertFn(url, poster);
      //         Msg.showSuccess('视频上传成功!');

      //         // 可选: 触发事件通知其他组件
      //         emitter.emit('uploadedVideo', { id, url, poster, filename });
      //       } else {
      //         Msg.showFail(res.message || '视频上传失败');
      //       }
      //     } catch (error: any) {
      //       console.error('视频上传出错:', error);
      //       Msg.showFail(error.message || '视频上传失败,请重试');
      //     }
      //   },

      //   // 上传前回调
      //   onBeforeUpload(file: File) {
      //     console.log('视频上传前检查:', file.name);
      //     // 可以在这里做额外的校验
      //     return file;
      //   },

      //   // 上传进度回调
      //   onProgress(progress: number) {
      //     console.log('视频上传进度:', progress + '%');
      //     // 可以在这里更新进度条 UI
      //   },

      //   // 上传成功回调
      //   onSuccess(file: File, res: any) {
      //     console.log(`${file.name} 上传成功`, res);
      //   },

      //   // 上传失败回调
      //   onFailed(file: File, res: any) {
      //     console.error(`${file.name} 上传失败`, res);
      //     Msg.showFail(`${file.name} 上传失败`);
      //   },

      //   // 上传错误或超时
      //   onError(file: File, err: any, res: any) {
      //     console.error(`${file.name} 上传出错`, err, res);
      //     Msg.showFail('视频上传出错,请检查网络连接');
      //   },
      // },
    },
  };

  return [toolbarConfig, editorConfig];
};
