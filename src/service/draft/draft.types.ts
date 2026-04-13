export type TiptapDocContent = {
  type: string;
  content?: TiptapDocContent[];
  [key: string]: unknown;
};

export interface DraftMeta {
  imageIds: number[];
  videoIds: number[];
  coverImageId: number | null;
  selectedTagIds: number[];
  [key: string]: unknown;
}

export interface DraftRecord {
  id: number;
  userId?: number;
  articleId: number | null;
  title: string | null;
  content: TiptapDocContent;
  meta: DraftMeta;
  version: number;
  createAt?: string;
  updateAt?: string;
}

export interface SaveDraftPayload {
  articleId: number | null;
  title: string | null;
  content: TiptapDocContent;
  meta: DraftMeta;
  version: number;
}

export interface DeleteDraftResult {
  id: number;
}

export interface DraftLocalFallback {
  title: string;
  tags: string[];
  draft: string;
  jsonContent?: TiptapDocContent;
  fileList: Array<{ url?: string; name?: string }>;
  pendingImageIds: number[];
  pendingVideoIds: number[];
  draftId?: number | null;
  articleId?: number | null;
  version?: number;
  lastSavedAt?: string | null;
}
