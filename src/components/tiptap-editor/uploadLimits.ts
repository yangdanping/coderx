export const MAX_IMAGE_FILE_SIZE_MB = 20;
export const MAX_IMAGE_FILE_SIZE = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

export const MAX_COVER_IMAGE_FILE_SIZE_MB = 2;
export const MAX_COVER_IMAGE_FILE_SIZE = MAX_COVER_IMAGE_FILE_SIZE_MB * 1024 * 1024;

export const MAX_VIDEO_FILE_SIZE_MB = 20;
export const MAX_VIDEO_FILE_SIZE = MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024;

export const MAX_VIDEO_COUNT = 2;

export const IMAGE_TYPE_LIMIT_MESSAGE = '只能上传图片文件';
export const IMAGE_SIZE_LIMIT_MESSAGE = `图片大小不能超过 ${MAX_IMAGE_FILE_SIZE_MB}MB`;
export const COVER_IMAGE_SIZE_LIMIT_MESSAGE = `封面图片大小不能超过 ${MAX_COVER_IMAGE_FILE_SIZE_MB}MB`;
export const VIDEO_TYPE_LIMIT_MESSAGE = '只能上传视频文件';
export const VIDEO_SIZE_LIMIT_MESSAGE = `视频大小不能超过 ${MAX_VIDEO_FILE_SIZE_MB}MB`;
export const VIDEO_COUNT_LIMIT_MESSAGE = `每篇文章最多只能上传 ${MAX_VIDEO_COUNT} 个视频`;

const isExpectedFileType = (file: File, prefix: string) =>
  typeof file.type === 'string' && file.type.startsWith(prefix);

export const getImageValidationMessage = (file: File) => {
  if (!isExpectedFileType(file, 'image/')) {
    return IMAGE_TYPE_LIMIT_MESSAGE;
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return IMAGE_SIZE_LIMIT_MESSAGE;
  }

  return null;
};

export const getCoverImageValidationMessage = (file: File) => {
  if (!isExpectedFileType(file, 'image/')) {
    return IMAGE_TYPE_LIMIT_MESSAGE;
  }

  if (file.size > MAX_COVER_IMAGE_FILE_SIZE) {
    return COVER_IMAGE_SIZE_LIMIT_MESSAGE;
  }

  return null;
};

export const getVideoValidationMessage = (file: File) => {
  if (!isExpectedFileType(file, 'video/')) {
    return VIDEO_TYPE_LIMIT_MESSAGE;
  }

  if (file.size > MAX_VIDEO_FILE_SIZE) {
    return VIDEO_SIZE_LIMIT_MESSAGE;
  }

  return null;
};
