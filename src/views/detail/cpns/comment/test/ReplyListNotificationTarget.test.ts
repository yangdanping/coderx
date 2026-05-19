import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IComment } from '@/service/comment/comment.request';

const { replyHarness } = vi.hoisted(() => ({
  replyHarness: {
    data: null as any,
    hasNextPage: null as any,
    isFetchingNextPage: null as any,
    fetchNextPage: vi.fn(),
  },
}));

vi.mock('@/composables/useCommentList', async () => {
  const { ref } = await import('vue');

  replyHarness.data = ref({ pages: [] });
  replyHarness.hasNextPage = ref(false);
  replyHarness.isFetchingNextPage = ref(false);

  return {
    useReplyList: () => ({
      data: replyHarness.data,
      isFetchingNextPage: replyHarness.isFetchingNextPage,
      hasNextPage: replyHarness.hasNextPage,
      fetchNextPage: replyHarness.fetchNextPage,
    }),
    flattenReplies: (data: { pages?: Array<{ items: IComment[] }> } | undefined) => data?.pages?.flatMap((page) => page.items) ?? [],
  };
});

vi.mock('../ReplyItem.vue', () => ({
  default: {
    name: 'ReplyItem',
    props: ['item', 'parentComment'],
    emits: ['scrollToParent'],
    template: '<article class="reply-item-stub" :data-reply-id="item.id">{{ item.content }}</article>',
  },
}));

import ReplyList from '../ReplyList.vue';

const createReply = (id: number, rid: number | null = null): IComment => ({
  id,
  content: `reply-${id}`,
  status: 0,
  cid: 33,
  rid,
  articleId: 12,
  createAt: '2026-05-14T08:00:00.000Z',
  author: {
    id,
    name: `user-${id}`,
    avatarUrl: null,
  },
  likes: 0,
  replyCount: 0,
  replies: [],
});

const createComment = (): IComment => ({
  id: 33,
  content: 'parent',
  status: 0,
  cid: null,
  rid: null,
  articleId: 12,
  createAt: '2026-05-14T08:00:00.000Z',
  author: {
    id: 10,
    name: 'author',
    avatarUrl: null,
  },
  likes: 0,
  replyCount: 4,
  replies: [createReply(101), createReply(102)],
});

describe('ReplyList notification target', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    replyHarness.fetchNextPage.mockReset();
    replyHarness.data.value = {
      pages: [
        {
          items: [createReply(101), createReply(102), createReply(103), createReply(104)],
          hasMore: false,
          nextCursor: null,
          replyCount: 4,
        },
      ],
    };
    replyHarness.hasNextPage.value = false;
    replyHarness.isFetchingNextPage.value = false;
    scrollIntoView.mockReset();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  it('expands, highlights, and scrolls to a target reply already present in the first loaded page', async () => {
    const wrapper = mount(ReplyList, {
      props: {
        comment: createComment(),
        targetReplyId: 104,
      },
      global: {
        stubs: {
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('收起回复');
    expect(wrapper.find('.reply-item-wrapper.is-highlighted [data-reply-id="104"]').exists()).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('loads additional reply pages until the target reply is available, then highlights and scrolls to it', async () => {
    replyHarness.data.value = {
      pages: [
        {
          items: [createReply(101), createReply(102), createReply(103)],
          hasMore: true,
          nextCursor: 'cursor-103',
          replyCount: 5,
        },
      ],
    };
    replyHarness.hasNextPage.value = true;
    replyHarness.fetchNextPage.mockImplementation(async () => {
      replyHarness.data.value = {
        pages: [
          ...replyHarness.data.value.pages,
          {
            items: [createReply(104), createReply(105)],
            hasMore: false,
            nextCursor: null,
            replyCount: 5,
          },
        ],
      };
      replyHarness.hasNextPage.value = false;
    });

    const wrapper = mount(ReplyList, {
      props: {
        comment: { ...createComment(), replyCount: 5 },
        targetReplyId: 105,
      },
      global: {
        stubs: {
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    });

    await flushPromises();
    await nextTick();
    await flushPromises();

    expect(replyHarness.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.reply-item-wrapper.is-highlighted [data-reply-id="105"]').exists()).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });
});
