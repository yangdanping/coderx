import { useInfiniteQuery } from '@tanstack/vue-query';
import { getFlowFeed } from '@/service/flow/flow.request';

const PAGE_SIZE = 10;

export const flowKeys = {
  all: ['flow'] as const,
  feed: () => [...flowKeys.all, 'feed'] as const,
};

export function useFlowFeed() {
  return useInfiniteQuery({
    queryKey: flowKeys.feed(),
    queryFn: async ({ pageParam = 1 }) => {
      return getFlowFeed(pageParam as number, PAGE_SIZE);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, p) => sum + p.items.length, 0);
      if (loadedCount >= lastPage.total) return undefined;
      return allPages.length + 1;
    },
  });
}
