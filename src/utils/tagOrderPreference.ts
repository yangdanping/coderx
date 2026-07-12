import { LocalCache } from '@/utils';

import type { Itag } from '@/stores/types/article.result';

export const TAG_ORDER_CACHE_KEY = 'coderx_guest_tag_order';

const normalizeTagIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.filter((tagId): tagId is number => Number.isSafeInteger(tagId) && tagId > 0)));
};

export const readGuestTagOrder = (): number[] => {
  try {
    return normalizeTagIds(LocalCache.getCache(TAG_ORDER_CACHE_KEY));
  } catch {
    return [];
  }
};

export const writeGuestTagOrder = (tagIds: number[]) => {
  LocalCache.setCache(TAG_ORDER_CACHE_KEY, normalizeTagIds(tagIds));
};

export const clearGuestTagOrder = () => {
  LocalCache.removeCache(TAG_ORDER_CACHE_KEY);
};

export const mergeTagsByPreference = (tags: Itag[], preferredTagIds: unknown): Itag[] => {
  const normalizedTagIds = normalizeTagIds(preferredTagIds);
  const tagsById = new Map(tags.filter((tag) => Number.isSafeInteger(tag.id) && Number(tag.id) > 0).map((tag) => [tag.id as number, tag]));
  const preferredTags = normalizedTagIds.map((tagId) => tagsById.get(tagId)).filter((tag): tag is Itag => tag != null);
  const preferredIds = new Set(preferredTags.map((tag) => tag.id));

  return [...preferredTags, ...tags.filter((tag) => !preferredIds.has(tag.id))];
};
