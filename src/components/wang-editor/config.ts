import type { IToolbarConfig, IEditorConfig } from '@wangeditor/editor';
import { uploadPicture } from '@/service/file/file.request';
import useArticleStore from '@/stores/article';
import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import { Msg } from '@/utils';
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
          const fd = new FormData();
          fd.append('picture', file);
          console.log('FormData picture', fd);
          // file 即选中的文件
          // 自己实现上传,并得到图片 url alt href,最后插入图片
          const res = await uploadPicture(fd);
          console.log('uploadPicture res', res);
          if (res.code === 0) {
            console.log('上传图片成功!', res);
            console.log('获取到了上传的图片', res.data[0].url);
            const imgId = res.data[0].result.insertId;
            articleStore.changeUploaded(imgId);
            const url = res.data[0].url;
            const href = res.data[0].url;
            insertFn(url, '', href);
          } else {
            Msg.showFail('图片上传失败');
          }
        }
      }
    }
  };

  return [toolbarConfig, editorConfig];
};
