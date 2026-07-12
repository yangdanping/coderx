import { readonly, ref, shallowRef } from 'vue';

import type { Itag } from '@/stores/types/article.result';

interface TagOrderSaveResult {
  code: number;
  data?: Itag[];
  msg?: string;
}

interface UseTagOrderOptions {
  saveOrder: (tagIds: number[]) => Promise<TagOrderSaveResult>;
  onSaveError?: (error: unknown) => void;
}

const moveItem = <T>(items: T[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (movedItem === undefined) return items;
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

export function useTagOrder({ saveOrder, onSaveError }: UseTagOrderOptions) {
  const orderedTags = ref<Itag[]>([]);
  const committedTags = ref<Itag[]>([]);
  const isSaving = shallowRef(false);

  const syncTags = (tags: Itag[]) => {
    if (isSaving.value) return;
    orderedTags.value = [...tags];
    committedTags.value = [...tags];
  };

  const reorderAndSave = async (fromIndex: number, toIndex: number) => {
    if (isSaving.value) return false;
    if (fromIndex === toIndex) return true;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= orderedTags.value.length || toIndex >= orderedTags.value.length) return false;

    const nextTags = moveItem(orderedTags.value, fromIndex, toIndex);
    const tagIds = nextTags.map((tag) => tag.id).filter((tagId): tagId is number => Number.isSafeInteger(tagId) && Number(tagId) > 0);
    if (tagIds.length !== nextTags.length) return false;

    orderedTags.value = nextTags;
    isSaving.value = true;

    try {
      const response = await saveOrder(tagIds);
      if (response.code !== 0) throw new Error(response.msg ?? '标签顺序保存失败');

      const normalizedTags = Array.isArray(response.data) ? response.data : nextTags;
      orderedTags.value = [...normalizedTags];
      committedTags.value = [...normalizedTags];
      return true;
    } catch (error) {
      orderedTags.value = [...committedTags.value];
      onSaveError?.(error);
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  return {
    orderedTags: readonly(orderedTags),
    isSaving: readonly(isSaving),
    syncTags,
    reorderAndSave,
  };
}
