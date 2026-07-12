import { getTags, saveTagOrder } from '@/service/article/article.request';
import { clearGuestTagOrder, mergeTagsByPreference, readGuestTagOrder } from '@/utils/tagOrderPreference';

import type { Itag } from '@/stores/types/article.result';

export type GuestTagOrderMigrationResult = 'none' | 'migrated' | 'failed';

export const migrateGuestTagOrderToAccount = async (): Promise<GuestTagOrderMigrationResult> => {
  const guestTagIds = readGuestTagOrder();
  if (guestTagIds.length === 0) return 'none';

  try {
    const tagsResponse = await getTags();
    if (tagsResponse.code !== 0 || !Array.isArray(tagsResponse.data)) return 'failed';

    const normalizedTags = mergeTagsByPreference(tagsResponse.data as Itag[], guestTagIds);
    const normalizedTagIds = normalizedTags.map((tag) => tag.id).filter((tagId): tagId is number => Number.isSafeInteger(tagId) && Number(tagId) > 0);
    if (normalizedTagIds.length !== normalizedTags.length) return 'failed';

    const saveResponse = await saveTagOrder(normalizedTagIds);
    if (saveResponse.code !== 0) return 'failed';

    clearGuestTagOrder();
    return 'migrated';
  } catch {
    return 'failed';
  }
};
