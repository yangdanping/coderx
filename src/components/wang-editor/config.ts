import { uploadPicture } from '@/service/file/file.request';
import useArticleStore from '@/stores/article';
import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import { Msg, emitter } from '@/utils';

import type { IToolbarConfig, IEditorConfig } from '@wangeditor/editor';
type InsertFnType = (url: string, alt: string, href: string) => void;

const articleStore = useArticleStore();
export const useEditorConfig = () => {
  // 配置
  const toolbarConfig: Partial<IToolbarConfig & any> = {};
  const editorConfig: Partial<IEditorConfig & any> = {
    placeholder: '请输入内容...',
    MENU_CONF: {
      uploadImage: {
        // 自定义上传
        async customUpload(file: File, insertFn: InsertFnType) {
          // file 即选中的文件
          // 自己实现上传,并得到图片 url alt href,最后插入图片
          const res = await uploadPicture(file);
          console.log('uploadPicture res', res);
          if (res.code === 0) {
            console.log('上传图片成功!', res);
            console.log('获取到了上传的图片', res.data[0].url);
            const imgId = res.data[0].result.insertId;
            const uploaded = articleStore.uploaded;
            if (uploaded.length && uploaded.some((img) => img.isCover)) {
              articleStore.updateUploaded(imgId);
            } else {
              // 当且仅当uploaded无图片且带编辑文章没有任何图片是封面时,设置该图片为封面
              articleStore.updateUploaded(imgId, true);
            }
            const url = res.data[0].url;
            emitter.emit('uploadedImage', { url, imgId });
            const href = res.data[0].url;
            insertFn(url, '', href);
          } else {
            Msg.showFail('图片上传失败');
          }
        },
      },
    },
  };

  return [toolbarConfig, editorConfig];
};
