import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { describe, expect, it, vi } from 'vitest';

import {
  commentKeys,
  useLikeComment,
  useLikeUserComment,
  userCommentInfiniteOptions,
} from '@/composables/useCommentList';
import { getUserCommentList, likeComment } from '@/service/comment/comment.request';

vi.mock('@/service/comment/comment.request', () => ({
  getCommentList: vi.fn(),
  getReplies: vi.fn(),
  getUserCommentList: vi.fn(),
  addComment: vi.fn(),
  addReply: vi.fn(),
  likeComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock('@/service/user/user.request', () => ({
  getLiked: vi.fn(),
}));

vi.mock('@/utils', () => ({
  Msg: {
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showFail: vi.fn(),
  },
  emitter: {
    emit: vi.fn(),
  },
}));

describe('user comment query options', () => {
  it('uses the user id in the key, forwards cancellation, and advances from page metadata', async () => {
    vi.mocked(getUserCommentList).mockResolvedValue({
      code: 0,
      data: {
        items: [{ id: 1 }],
        total: 3,
        hasMore: true,
        pageNum: 1,
        pageSize: 2,
      },
    } as never);

    const options = userCommentInfiniteOptions(7, 2);
    const signal = new AbortController().signal;
    if (typeof options.queryFn !== 'function') {
      throw new Error('Expected user comment queryFn to be callable');
    }
    const page = await options.queryFn({
      pageParam: 1,
      signal,
      queryKey: options.queryKey,
      direction: 'forward',
      meta: undefined,
      client: undefined,
    } as never);

    expect(options.queryKey).toEqual(commentKeys.userList(7, 2));
    expect(userCommentInfiniteOptions(7, 10).queryKey).not.toEqual(options.queryKey);
    expect(getUserCommentList).toHaveBeenCalledWith(
      { userId: 7, pageNum: 1, pageSize: 2 },
      signal,
    );
    expect(options.getNextPageParam(page, [page], 1, [1])).toBe(2);
    expect(options.getNextPageParam({ ...page, hasMore: false }, [page], 1, [1])).toBeUndefined();
  });

  it('invalidates profile comment lists and the current user liked query after liking', async () => {
    vi.mocked(likeComment).mockResolvedValue({
      code: 0,
      data: { liked: true, likes: 4 },
    } as never);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    let mutation: ReturnType<typeof useLikeUserComment> | undefined;

    mount(
      defineComponent({
        setup() {
          mutation = useLikeUserComment();
          return () => h('div');
        },
      }),
      {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: {
                  userInfo: { id: 42 },
                },
              },
            }),
            [VueQueryPlugin, { queryClient }],
          ],
        },
      },
    );

    await mutation?.mutateAsync(9);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: commentKeys.userLists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: commentKeys.userLiked(42) });
  });

  it('invalidates profile comment lists when a comment is liked from article detail', async () => {
    vi.mocked(likeComment).mockResolvedValue({
      code: 0,
      data: { liked: true, likes: 4 },
    } as never);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    let mutation: ReturnType<typeof useLikeComment> | undefined;

    mount(
      defineComponent({
        setup() {
          mutation = useLikeComment(ref('12'));
          return () => h('div');
        },
      }),
      {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: {
                  userInfo: { id: 42 },
                },
              },
            }),
            [VueQueryPlugin, { queryClient }],
          ],
        },
      },
    );

    await mutation?.mutateAsync(9);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: commentKeys.userLists() });
  });
});
