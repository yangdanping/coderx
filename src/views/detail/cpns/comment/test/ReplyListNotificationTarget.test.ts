import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import type { IComment } from '@/service/comment/comment.request';

const { replyHarness } = vi.hoisted(() => ({
  replyHarness: {
    data: null as any,
    hasNextPage: null as any,
    isFetchingNextPage: null as any,
    fetchNextPage: vi.fn(),
    locateComment: vi.fn(),
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
    useCommentLocator: () => ({
      locateComment: replyHarness.locateComment,
    }),
    flattenReplies: (data: { pages?: Array<{ items: IComment[] }> } | undefined) => data?.pages?.flatMap((page) => page.items) ?? [],
  };
});

vi.mock('../ReplyItem.vue', () => ({
  default: {
    name: 'ReplyItem',
    props: ['item', 'parentComment', 'traceRole'],
    emits: ['scrollToParent'],
    template:
      '<article class="reply-item-stub" :data-reply-id="item.id">{{ item.content }}<span v-if="traceRole">{{ traceRole === "source" ? "当前回复" : "原回复" }}</span></article>',
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
  const focus = vi.fn();
  let prefersReducedMotion = false;

  beforeEach(() => {
    setActivePinia(createPinia());
    prefersReducedMotion = false;
    replyHarness.fetchNextPage.mockReset();
    replyHarness.locateComment.mockReset();
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
    focus.mockReset();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window.HTMLElement.prototype, 'focus', {
      configurable: true,
      value: focus,
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' && prefersReducedMotion,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
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
    expect(wrapper.find('.reply-item-wrapper.is-trace-source [data-reply-id="104"]').exists()).toBe(true);
    expect(wrapper.get('#reply-104').attributes('tabindex')).toBe('-1');
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('loads the exact target reply instead of walking every preceding page', async () => {
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
    replyHarness.locateComment.mockResolvedValue(createReply(105));

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

    expect(replyHarness.locateComment).toHaveBeenCalledWith(105);
    expect(replyHarness.fetchNextPage).not.toHaveBeenCalled();
    expect(wrapper.find('.reply-item-wrapper.is-trace-source [data-reply-id="105"]').exists()).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('distinguishes the current reply from its original reply without motion', async () => {
    replyHarness.data.value = {
      pages: [
        {
          items: [createReply(101), createReply(104, 101)],
          hasMore: false,
          nextCursor: null,
          replyCount: 2,
        },
      ],
    };
    prefersReducedMotion = true;

    const wrapper = mount(ReplyList, {
      props: {
        comment: { ...createComment(), replyCount: 2 },
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

    expect(wrapper.get('#reply-104').classes()).toContain('is-trace-source');
    expect(wrapper.get('#reply-101').classes()).toContain('is-trace-target');
    expect(wrapper.get('#reply-104').text()).toContain('当前回复');
    expect(wrapper.get('#reply-101').text()).toContain('原回复');
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
  });
});
