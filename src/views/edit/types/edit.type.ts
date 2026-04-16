import type { TiptapDocContent } from '@/service/draft/draft.types';

export interface EditViewProps {
  borderColor?: string;
  defaultExpose?: number;
  pulledExpose?: number;
}

export interface EditEditorExpose {
  getHTML: () => string;
  getJSON: () => TiptapDocContent | undefined;
  setContent: (content: string | TiptapDocContent, emitUpdate?: boolean) => void;
  setSelectionToEnd: () => void;
  getEditor: () => unknown;
}
