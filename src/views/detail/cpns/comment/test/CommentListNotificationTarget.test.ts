import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IComment } from '@/service/comment/comment.request';

const route = reactive({
  params: {
    articleId: '12',
  },
  query: {
    commentId: '202',
    replyId: '909',
  } as Record<string, string>,
});

const { commentHarness } = vi.hoisted(() => ({
  commentHarness: {
    data: null as any,
    hasNextPage: null as any,
    isFetchingNextPage: null as any,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  },
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => route,
  };
});

vi.mock('@/composables/useCommentList', async () => {
  const { ref } = await import('vue');

  commentHarness.data = ref({ pages: [] });
  commentHarness.hasNextPage = ref(false);
  commentHarness.isFetchingNextPage = ref(false);

  return {
    useCommentList: () => ({
      data: commentHarness.data,
      isPending: ref(false),
      isError: ref(false),
      isFetchingNextPage: commentHarness.isFetchingNextPage,
      hasNextPage: commentHarness.hasNextPage,
      fetchNextPage: commentHarness.fetchNextPage,
      refetch: commentHarness.refetch,
    }),
    flattenComments: (data: { pages?: Array<{ items: IComment[] }> } | undefined) => data?.pages?.flatMap((page) => page.items) ?? [],
    getTotalCount: (data: { pages?: Array<{ totalCount?: number }> } | undefined) => data?.pages?.[0]?.totalCount ?? 0,
  };
});

vi.mock('../CommentListItem.vue', () => ({
  default: defineComponent({
    name: 'CommentListItem',
    props: {
      item: {
        type: Object,
        required: true,
      },
      floor: {
        type: Number,
        default: undefined,
      },
      targetReplyId: {
        type: Number,
        default: null,
      },
    },
    setup(props) {
      return () =>
        h('section', {
          class: 'comment-list-item-stub',
          'data-comment-id': (props.item as IComment).id,
          'data-target-reply-id': props.targetReplyId ?? '',
        });
    },
  }),
}));

import CommentList from '../CommentList.vue';

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

const createComment = (id: number): IComment => ({
  id,
  content: `comment-${id}`,
  status: 0,
  cid: null,
  rid: null,
  articleId: 12,
  createAt: '2026-05-14T08:00:00.000Z',
  author: {
    id,
    name: `author-${id}`,
    avatarUrl: null,
  },
  likes: 0,
  replyCount: 0,
  replies: [],
});

describe('CommentList notification target', () => {
  beforeEach(() => {
    route.params.articleId = '12';
    route.query = {
      commentId: '202',
      replyId: '909',
    };
    commentHarness.fetchNextPage.mockReset();
    commentHarness.refetch.mockReset();
    commentHarness.data.value = {
      pages: [
        {
          items: [createComment(101)],
          hasMore: true,
          nextCursor: 'cursor-101',
          totalCount: 2,
        },
      ],
    };
    commentHarness.hasNextPage.value = true;
    commentHarness.isFetchingNextPage.value = false;
    commentHarness.fetchNextPage.mockImplementation(async () => {
      commentHarness.data.value = {
        pages: [
          ...commentHarness.data.value.pages,
          {
            items: [createComment(202)],
            hasMore: false,
            nextCursor: null,
            totalCount: 2,
          },
        ],
      };
      commentHarness.hasNextPage.value = false;
    });
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  it('fetches more top-level comment pages until the notification parent comment is loaded and passes only that item the target reply id', async () => {
    const wrapper = mount(CommentList, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              article: {
                article: {
                  id: 12,
                  commentCount: 0,
                },
              },
              comment: {
                activeReplyId: null,
                activeEditId: null,
              },
            },
          }),
        ],
        stubs: {
          ElButton: true,
          ElDropdown: { template: '<div><slot /><slot name="dropdown" /></div>' },
          ElDropdownItem: { template: '<button><slot /></button>' },
          ElDropdownMenu: { template: '<div><slot /></div>' },
          ElIcon: { template: '<span><slot /></span>' },
          ElSkeleton: true,
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(commentHarness.fetchNextPage).toHaveBeenCalledTimes(1);
    const loadedItems = wrapper.findAll('.comment-list-item-stub');
    expect(loadedItems).toHaveLength(2);
    expect(loadedItems[0]?.attributes('data-target-reply-id')).toBe('');
    expect(loadedItems[1]?.attributes('data-comment-id')).toBe('202');
    expect(loadedItems[1]?.attributes('data-target-reply-id')).toBe('909');
  });
});
