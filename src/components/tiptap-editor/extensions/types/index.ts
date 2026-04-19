export type { EditorJsonNode, VideoNodeAttrs, VideoRegistryEntry } from './video-node.type';
export type { ImageNodeAttrs } from './image-node.type';
export type { VideoSelectionView } from './video-selection.type';
export type {
  PollTranscodeOutcome,
  PollTranscodeStatusOptions,
  PollTranscodeStatusResult,
  RevalidateVideoNodesHooks,
} from './video-transcode.type';

/** 图片上传扩展与工具栏共用的选项类型（定义在 `tiptap-editor/types`，此处聚合导出便于扩展侧 `from './types'` 一次引入） */
export type {
  ImageUploadCommandOptions,
  UploadInsertSelection,
  UploadedImagePayload,
} from '../../types/upload.type';
