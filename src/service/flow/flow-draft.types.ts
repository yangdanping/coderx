import type { TiptapDocContent } from '@/service/draft/draft.types';

export interface FlowDraftMeta {
  imageIds: number[];
  videoIds: number[];
  [key: string]: unknown;
}

export interface FlowDraftSnapshot {
  content: TiptapDocContent;
  meta: FlowDraftMeta;
}

export interface SaveFlowDraftPayload extends FlowDraftSnapshot {
  version: number;
}

export interface FlowDraftRecord {
  id: number;
  userId?: number;
  draftType: 'flow';
  articleId: null;
  title: null;
  content: TiptapDocContent;
  meta: FlowDraftMeta;
  version: number;
  createAt?: string;
  updateAt?: string;
}

export interface DeleteFlowDraftResult {
  id: number;
}

export interface FlowDraftLocalFallback extends FlowDraftSnapshot {
  schemaVersion: 1;
  actorKey: string;
  draftId: number | null;
  version: number;
  serverUpdatedAt: string | null;
  localUpdatedAt: string;
}
