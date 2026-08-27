import type { TiptapDocContent } from '@/service/draft/draft.types';
import type { FlowImageAsset } from './flow.types';

export interface FlowDraftMeta {
  imageIds: number[];
  videoIds: number[];
  [key: string]: unknown;
}

export interface FlowDraftSnapshot {
  content: TiptapDocContent;
  meta: FlowDraftMeta;
}

export interface FlowDraftRestoreState extends FlowDraftSnapshot {
  images: FlowImageAsset[];
  imagesComplete: boolean;
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
  images?: FlowImageAsset[];
  version: number;
  createAt?: string;
  updateAt?: string;
}

export interface DeleteFlowDraftResult {
  id: number;
}

interface FlowDraftLocalFallbackBase extends FlowDraftSnapshot {
  actorKey: string;
  draftId: number | null;
  version: number;
  serverUpdatedAt: string | null;
  localUpdatedAt: string;
}

export interface FlowDraftLocalFallbackV1 extends FlowDraftLocalFallbackBase {
  schemaVersion: 1;
}

export interface FlowDraftLocalFallbackV2 extends FlowDraftLocalFallbackBase {
  schemaVersion: 2;
  images: FlowImageAsset[];
}

export type FlowDraftLocalFallback = FlowDraftLocalFallbackV1 | FlowDraftLocalFallbackV2;
