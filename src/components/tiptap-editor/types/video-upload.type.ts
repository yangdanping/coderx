import type { UploadInsertSelection } from './upload.type';

export interface UploadVideoOptions {
  insertSelection?: UploadInsertSelection | null;
}

export type VideoTranscodeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IUploadVideoResponse {
  code: number;
  message?: string;
  msg?: string;
  data: {
    id?: number;
    url: string;
    poster?: string | null;
    filename?: string;
    transcodeStatus?: VideoTranscodeStatus;
  };
}

/**
 * `GET /video/:id` 返回的视频完整信息，只列出前端关心的字段。
 * 后端实际走 `videoService.getVideoById`，字段见 video_meta schema。
 */
export interface IVideoStatusResponse {
  code: number;
  msg?: string;
  data: {
    id: number;
    filename?: string;
    poster?: string | null;
    duration?: number | null;
    width?: number | null;
    height?: number | null;
    bitrate?: number | null;
    format?: string | null;
    transcode_status?: VideoTranscodeStatus;
  } | null;
}
