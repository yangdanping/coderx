import { defineComponent, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IComment } from '@/service/comment/comment.request';

const resizeObservers: ResizeObserverMock[] = [];

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObservers.push(this);
  }

  trigger(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

vi.mock('@/utils', () => ({
  codeHeightlight: vi.fn(),
}));

import ReplyItem from '../ReplyItem.vue';

const createReply = (): IComment => ({
  id: 102,
  content: '<p>回复内容</p>',
  status: 0,
  cid: 33,
  rid: 101,
  articleId: 12,
  createAt: '2026-05-14T08:00:00.000Z',
  author: {
    id: 2,
    name: '当前用户',
    avatarUrl: null,
  },
  likes: 0,
  replyTo: {
    id: 1,
    name: '原用户',
    content: '<p>较长的原回复</p>',
  },
});

const createComment = (): IComment => ({
  id: 33,
  content: 'parent',
  status: 0,
  cid: null,
  rid: null,
  articleId: 12,
  createAt: '2026-05-14T07:00:00.000Z',
  author: {
    id: 1,
    name: '作者',
    avatarUrl: null,
  },
  likes: 0,
  replyCount: 1,
  replies: [],
});

const EmptyStub = defineComponent({ template: '<div />' });

describe('ReplyItem quoted reply interaction', () => {
  beforeEach(() => {
    resizeObservers.length = 0;
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  it('rechecks quote overflow after content resizes and announces layout changes', async () => {
    const wrapper = mount(ReplyItem, {
      props: {
        item: createReply(),
        parentComment: createComment(),
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              article: { article: { author: { id: 1 } } },
              comment: { activeReplyId: null },
            },
          }),
        ],
        directives: {
          dompurifyHtml: {
            mounted(element, binding) {
              element.innerHTML = String(binding.value ?? '');
            },
          },
          dateformat: () => undefined,
        },
        stubs: {
          Avatar: EmptyStub,
          CommentAction: EmptyStub,
          CommentForm: EmptyStub,
          CommentTools: EmptyStub,
          ElTag: EmptyStub,
        },
      },
    });
    await flushPromises();
    await nextTick();

    const quotedBody = wrapper.get<HTMLElement>('.quoted-body').element;
    Object.defineProperty(quotedBody, 'scrollHeight', {
      configurable: true,
      value: 220,
    });

    expect(resizeObservers).toHaveLength(1);
    resizeObservers[0]?.trigger(quotedBody);
    await nextTick();

    const toggle = wrapper.get('button.toggle-text');
    expect(toggle.attributes('aria-expanded')).toBe('false');

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(wrapper.emitted('layoutChange')).toHaveLength(1);
  });
});
