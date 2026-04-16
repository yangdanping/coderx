import type { UploadInsertSelection } from './upload.type';

export interface UploadVideoOptions {
  insertSelection?: UploadInsertSelection | null;
}

export interface IUploadVideoResponse {
  code: number;
  message?: string;
  data: {
    id?: number;
    url: string;
    poster?: string | null;
  };
}
