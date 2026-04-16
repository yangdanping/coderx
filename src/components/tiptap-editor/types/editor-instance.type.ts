import { useEditor } from '@tiptap/vue-3';

/** Markdown storage（可选方法，避免与扩展 storage 类型冲突） */
export interface MarkdownStorageType {
  getMarkdown?: () => string;
}

export type EditorInstance = ReturnType<typeof useEditor>['value'] | any;

export type EditorDocumentContent = string | Record<string, unknown>;
