export const MAX_FLOW_IMAGE_COUNT = 9;
export const MAX_FLOW_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FLOW_IMAGE_BATCH_SIZE = 30 * 1024 * 1024;

const FLOW_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type FlowImageRejectionReason = 'unsupported-type' | 'file-too-large' | 'batch-too-large' | 'count-limit';

export interface FlowImageRejection {
  file: File;
  reason: FlowImageRejectionReason;
  message: string;
}

export interface FlowImageValidationResult {
  accepted: File[];
  rejected: FlowImageRejection[];
}

function reject(file: File, reason: FlowImageRejectionReason, message: string): FlowImageRejection {
  return { file, reason, message };
}

export function validateFlowImageFiles(files: readonly File[], retainedCount: number): FlowImageValidationResult {
  const normalizedRetainedCount = Number.isSafeInteger(retainedCount) ? Math.min(MAX_FLOW_IMAGE_COUNT, Math.max(0, retainedCount)) : MAX_FLOW_IMAGE_COUNT;
  const remainingCapacity = MAX_FLOW_IMAGE_COUNT - normalizedRetainedCount;
  const accepted: File[] = [];
  const rejected: FlowImageRejection[] = [];
  let acceptedBytes = 0;

  for (const file of files) {
    if (!FLOW_IMAGE_MIME_TYPES.has(file.type)) {
      rejected.push(reject(file, 'unsupported-type', '仅支持 JPEG、PNG 或 WebP 图片'));
      continue;
    }
    if (file.size > MAX_FLOW_IMAGE_FILE_SIZE) {
      rejected.push(reject(file, 'file-too-large', '单张图片不能超过 10MB'));
      continue;
    }
    if (accepted.length >= remainingCapacity) {
      rejected.push(
        reject(
          file,
          'count-limit',
          normalizedRetainedCount >= MAX_FLOW_IMAGE_COUNT
            ? '已保留 9 张图片，请先删除后再添加'
            : `当前已保留 ${normalizedRetainedCount} 张，本次最多还能添加 ${remainingCapacity} 张`,
        ),
      );
      continue;
    }
    if (acceptedBytes + file.size > MAX_FLOW_IMAGE_BATCH_SIZE) {
      rejected.push(reject(file, 'batch-too-large', '单次添加的图片总大小不能超过 30MB'));
      continue;
    }

    accepted.push(file);
    acceptedBytes += file.size;
  }

  return { accepted, rejected };
}
