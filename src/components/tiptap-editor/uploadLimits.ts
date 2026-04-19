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
export const VIDEO_MAGIC_NUMBER_INVALID_MESSAGE = '文件头校验失败，可能不是有效的视频文件';

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

const bytesToAscii = (bytes: Uint8Array) => Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

const bytesStartsWith = (bytes: Uint8Array, signature: number[]) => {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
};

const readFileHead = async (file: File, length: number) => {
  const headBlob = file.slice(0, length);
  const headBuffer = await headBlob.arrayBuffer();
  return new Uint8Array(headBuffer);
};

/**
 * 基于 magic number 做一次廉价的文件头校验，避免明显不是视频的文件走到后端。
 *
 * - mp4/mov/m4v：ISO BMFF 容器，偏移 4-8 字节是 `ftyp` box
 * - webm/mkv：EBML header，起始 4 字节 `1A 45 DF A3`
 * - 其它视频类型（avi/flv/...）暂未覆盖，直接放过给服务端 ffprobe 兜底
 *
 * 返回 null 表示校验通过（或未覆盖的类型）；返回错误文案表示已被判定无效。
 */
export const getVideoMagicNumberMismatchMessage = async (file: File): Promise<string | null> => {
  const fileType = typeof file.type === 'string' ? file.type : '';

  try {
    if (fileType === 'video/mp4' || fileType === 'video/quicktime' || fileType === 'video/x-m4v') {
      const head = await readFileHead(file, 12);
      const sig = bytesToAscii(head.slice(4, 8));
      if (sig !== 'ftyp') {
        return VIDEO_MAGIC_NUMBER_INVALID_MESSAGE;
      }
      return null;
    }

    if (fileType === 'video/webm' || fileType === 'video/x-matroska') {
      const head = await readFileHead(file, 4);
      if (!bytesStartsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) {
        return VIDEO_MAGIC_NUMBER_INVALID_MESSAGE;
      }
      return null;
    }
  } catch (error) {
    console.warn('[uploadLimits] 读取视频文件头失败，跳过 magic number 校验:', error);
    return null;
  }

  return null;
};
