import type { UploadedImagePayload } from './upload.type';

export interface MarkdownSourceSelection {
  start: number;
  end: number;
}

export interface ToolbarImageUploadOptions {
  onUploaded?: ((payload: UploadedImagePayload) => void) | null;
}

export type InsertSplitPreviewBlockquote = (() => void) | null;
