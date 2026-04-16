import type { IArticle } from '@/stores/types/article.result';

export interface PullDownHeaderProps {
  modelValue: string;
  isPulled: boolean;
  tags?: string[];
  coverPreviewUrl?: string | null;
  draftId?: number | null;
  editData?: IArticle | Record<string, any>;
  draft?: string;
}
