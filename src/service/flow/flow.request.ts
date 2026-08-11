import myRequest from '@/service';

import type { AxiosProgressEvent } from 'axios';
import type { CreateFlowPayload, FlowAuthor, FlowFeedPage, FlowImageAsset, FlowItem, FlowMedia } from './flow.types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isFlowAuthor(value: unknown): value is FlowAuthor {
  return isRecord(value) && isPositiveSafeInteger(value.id) && typeof value.name === 'string' && typeof value.username === 'string' && typeof value.avatarUrl === 'string';
}

function isFlowMedia(value: unknown): value is FlowMedia {
  return isRecord(value) && isPositiveSafeInteger(value.id) && typeof value.url === 'string' && typeof value.thumbnailUrl === 'string' && typeof value.title === 'string';
}

function isFlowItem(value: unknown): value is FlowItem {
  return (
    isRecord(value) &&
    isPositiveSafeInteger(value.id) &&
    isFlowAuthor(value.author) &&
    typeof value.body === 'string' &&
    typeof value.bodyHtml === 'string' &&
    Array.isArray(value.media) &&
    value.media.every(isFlowMedia) &&
    isNonNegativeSafeInteger(value.likes) &&
    isNonNegativeSafeInteger(value.comments) &&
    typeof value.liked === 'boolean' &&
    typeof value.createdAt === 'string'
  );
}

function isFlowFeedPage(value: unknown): value is FlowFeedPage {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isFlowItem) &&
    isNonNegativeSafeInteger(value.total) &&
    isPositiveSafeInteger(value.page) &&
    isPositiveSafeInteger(value.pageSize) &&
    value.pageSize <= 100
  );
}

function isFlowImageAsset(value: unknown): value is FlowImageAsset {
  return (
    isRecord(value) &&
    isPositiveSafeInteger(value.id) &&
    typeof value.url === 'string' &&
    typeof value.thumbnailUrl === 'string' &&
    value.mimeType === 'image/webp' &&
    isPositiveSafeInteger(value.sizeBytes) &&
    isPositiveSafeInteger(value.width) &&
    isPositiveSafeInteger(value.height)
  );
}

function unwrapSuccess<T>(response: unknown, isData: (value: unknown) => value is T, operation: string): T {
  if (!isRecord(response) || response.code !== 0) {
    throw new Error(`${operation} expected a success envelope with code 0`);
  }
  if (!isData(response.data)) {
    throw new Error(`${operation} returned malformed response data`);
  }
  return response.data;
}

function requirePositiveId(value: number, name: string): number {
  if (!isPositiveSafeInteger(value)) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function requirePage(value: number, name: string): number {
  if (!isPositiveSafeInteger(value)) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function isNotFound(error: unknown): boolean {
  if (!isRecord(error) || !isRecord(error.response)) return false;
  return error.response.status === 404;
}

export async function uploadFlowImage(file: File, onProgress: (progress: number) => void, signal?: AbortSignal): Promise<FlowImageAsset> {
  const data = new FormData();
  data.append('image', file);
  const response = await myRequest.post<unknown>({
    url: '/media/images',
    data,
    signal,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (typeof event.total !== 'number' || event.total <= 0) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(Math.min(100, Math.max(0, progress)));
    },
    showLoading: false,
    showError: false,
  });
  return unwrapSuccess(response, isFlowImageAsset, 'Flow image upload');
}

export async function deletePendingFlowImage(mediaId: number): Promise<void> {
  const normalizedId = requirePositiveId(mediaId, 'mediaId');
  const response = await myRequest.delete<unknown>({
    url: `/media/images/${normalizedId}`,
    showLoading: false,
    showError: false,
  });
  unwrapSuccess(response, (value): value is { deleted: boolean } => isRecord(value) && typeof value.deleted === 'boolean', 'Pending Flow image deletion');
}

export async function createFlow(payload: CreateFlowPayload): Promise<FlowItem> {
  const response = await myRequest.post<unknown>({
    url: '/flow',
    data: payload,
    showLoading: false,
    showError: false,
  });
  return unwrapSuccess(response, isFlowItem, 'Flow creation');
}

export async function getFlowFeed(page: number, pageSize = 10): Promise<FlowFeedPage> {
  const normalizedPage = requirePage(page, 'page');
  const normalizedPageSize = requirePage(pageSize, 'pageSize');
  if (normalizedPageSize > 100) {
    throw new RangeError('pageSize must be between 1 and 100');
  }
  const response = await myRequest.get<unknown>({
    url: '/flow',
    params: { pageNum: normalizedPage, pageSize: normalizedPageSize },
    showLoading: false,
  });
  return unwrapSuccess(response, isFlowFeedPage, 'Flow feed');
}

export async function getFlowItemById(flowId: number): Promise<FlowItem | null> {
  const normalizedId = requirePositiveId(flowId, 'flowId');
  try {
    const response = await myRequest.get<unknown>({
      url: `/flow/${normalizedId}`,
      showLoading: false,
    });
    return unwrapSuccess(response, isFlowItem, 'Flow detail');
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}
