import type { UploadedImagePayload } from './upload.type';
import type { UploadedVideoPayload } from './video-upload.type';

export interface MarkdownSourceSelection {
  start: number;
  end: number;
}

export interface ToolbarImageUploadOptions {
  onUploaded?: ((payload: UploadedImagePayload) => void) | null;
}

export interface ToolbarVideoUploadOptions {
  onUploaded?: ((payload: UploadedVideoPayload) => void) | null;
}

export type InsertSplitPreviewBlockquote = (() => void) | null;
