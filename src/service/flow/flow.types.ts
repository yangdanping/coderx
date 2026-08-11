import type { TiptapDocContent } from '@/service/draft/draft.types';

export interface FlowAuthor {
  id: number;
  name: string;
  username: string;
  avatarUrl: string;
}

export interface FlowMedia {
  id: number;
  url: string;
  thumbnailUrl: string;
  title: string;
}

export interface FlowItem {
  id: number;
  author: FlowAuthor;
  body: string;
  bodyHtml: string;
  media: FlowMedia[];
  likes: number;
  comments: number;
  liked: boolean;
  createdAt: string;
}

export interface FlowFeedPage {
  items: FlowItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type FlowUploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

export interface FlowImageAsset {
  id: number;
  url: string;
  thumbnailUrl: string;
  mimeType: 'image/webp';
  sizeBytes: number;
  width: number;
  height: number;
}

export interface FlowImageAttachment {
  clientId: string;
  file: File;
  previewUrl: string;
  status: FlowUploadStatus;
  progress: number;
  mediaId: number | null;
  url: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  error: string | null;
}

export interface CreateFlowPayload {
  clientRequestId: string;
  content: TiptapDocContent;
  mediaIds: number[];
}
