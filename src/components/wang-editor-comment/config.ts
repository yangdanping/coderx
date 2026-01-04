import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import { useBaseEditorConfig } from '@/components/wang-editor/config';
import type { IToolbarConfig, IEditorConfig } from '@wangeditor/editor';

/**
 * 评论编辑器配置（精简版）
 * 仅包含评论所需的基础功能，不含图片/视频上传
 */
export const useCommentEditorConfig = () => {
  const [toolbarConfig, baseEditorConfig] = useBaseEditorConfig();

  // 评论编辑器配置（可根据需求扩展）
  const editorConfig: Partial<IEditorConfig & any> = {
    ...baseEditorConfig,
    placeholder: '请输入评论内容...',
    MENU_CONF: {
      ...baseEditorConfig.MENU_CONF,
      // 评论区特定配置可在此添加
    },
  };

  return [toolbarConfig, editorConfig] as const;
};
