import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const commentMocks = vi.hoisted(() => ({
  useUserCommentList: vi.fn(),
  useUserLikedComments: vi.fn(),
  useLikeUserComment: vi.fn(),
}));

const scrollMocks = vi.hoisted(() => ({
  useInfiniteScroll: vi.fn(),
}));

vi.mock('@/composables/useCommentList', () => commentMocks);
vi.mock('@/composables/useInfiniteScroll', () => scrollMocks);

import UserComment from '../UserComment.vue';

function setCommentQuery(overrides: Record<string, unknown> = {}) {
  const query = {
    items: ref([]),
    isPending: ref(false),
    isError: ref(false),
    error: ref<Error | null>(null),
    hasNextPage: ref(false),
    isFetchingNextPage: ref(false),
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
  commentMocks.useUserCommentList.mockReturnValue(query);
  return query;
}

function mountUserComment() {
  return mount(UserComment, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            user: {
              profile: {
                id: 7,
                sex: '女',
                commentCount: 1,
              },
            },
          },
        }),
      ],
      stubs: {
        ListItem: {
          props: ['item'],
          template: '<div class="comment-item">{{ item.content }}<slot name="action" /></div>',
        },
        CommentAction: true,
        ElSkeleton: { template: '<div class="skeleton" />' },
        ElButton: true,
      },
    },
  });
}

describe('UserComment', () => {
  beforeEach(() => {
    commentMocks.useUserLikedComments.mockReturnValue({ isLiked: vi.fn(() => false) });
    commentMocks.useLikeUserComment.mockReturnValue({ mutate: vi.fn() });
    scrollMocks.useInfiniteScroll.mockReturnValue({ infiniteSentinel: ref(null) });
  });

  it('renders empty and error states from the query', async () => {
    const query = setCommentQuery();
    const wrapper = mountUserComment();
    expect(wrapper.text()).toContain('这个人未发表过评论');

    query.isError.value = true;
    query.error.value = new Error('comment network');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('comment network');
    await wrapper.find('.retry-button').trigger('click');
    expect(query.refetch).toHaveBeenCalledOnce();
  });

  it('renders query comments and connects infinite loading', () => {
    const query = setCommentQuery({
      items: ref([{ id: 1, content: 'Query comment', likes: 0 }]),
      hasNextPage: ref(true),
    });
    const wrapper = mountUserComment();

    expect(wrapper.text()).toContain('Query comment');
    const scrollOptions = scrollMocks.useInfiniteScroll.mock.calls.at(-1)?.[0];
    scrollOptions.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledOnce();
  });
});
