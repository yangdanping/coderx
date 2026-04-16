export interface UploadInsertSelection {
  from: number;
  to: number;
}

export interface UploadedImagePayload {
  url: string;
  imgId: number;
}

export interface ImageUploadCommandOptions {
  insertSelection?: UploadInsertSelection | null;
  onUploaded?: ((payload: UploadedImagePayload) => void) | null;
}
