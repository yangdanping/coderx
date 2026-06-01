import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resizeObservers: MockResizeObserver[] = [];

class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private observed: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObservers.push(this);
  }

  observe = (target: Element) => {
    this.observed.push(target);
  };

  disconnect = () => {
    this.observed = [];
  };

  trigger = () => {
    this.callback(
      this.observed.map((target) => ({ target }) as ResizeObserverEntry),
      this as unknown as ResizeObserver,
    );
  };
}

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn(() =>
    ref({
      getHTML: vi.fn(() => ''),
      getAttributes: vi.fn(() => ({})),
      isActive: vi.fn(() => false),
      destroy: vi.fn(),
      chain: () => ({
        setContent: () => ({ run: vi.fn() }),
        clearContent: () => ({ run: vi.fn() }),
        focus: () => ({
          toggleBold: () => ({ run: vi.fn() }),
          toggleItalic: () => ({ run: vi.fn() }),
          extendMarkRange: () => ({
            unsetLink: () => ({ run: vi.fn() }),
            setLink: () => ({ run: vi.fn() }),
          }),
        }),
      }),
    }),
  ),
  EditorContent: defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () =>
        h('div', {
          ...attrs,
          'data-testid': 'comment-editor-content',
        });
    },
  }),
}));

vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  }),
}));

vi.mock('../CommentToolbar.vue', () => ({
  default: defineComponent({
    setup() {
      return () => h('div');
    },
  }),
}));

vi.mock('../config', () => ({
  getCommentEditorExtensions: vi.fn(() => []),
  defaultCommentEditorConfig: {},
}));

vi.mock('@/utils', () => ({
  emitter: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

import TiptapEditorComment from '../TiptapEditorComment.vue';

const mountEditor = (heightStorageKey: string) =>
  mount(TiptapEditorComment, {
    props: { heightStorageKey } as any,
    global: {
      stubs: {
        ElTooltip: defineComponent({
          setup(_, { slots }) {
            return () => h('div', slots.default?.());
          },
        }),
        ElButton: defineComponent({
          setup(_, { slots }) {
            return () => h('button', slots.default?.());
          },
        }),
      },
    },
  });

describe('TiptapEditorComment height preference', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resizeObservers.length = 0;
    window.localStorage.clear();
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('restores height from the provided storage key', async () => {
    window.localStorage.setItem('comment-editor:article-content-height', '240');
    window.localStorage.setItem('comment-editor:reply-content-height', '320');
    window.localStorage.setItem('comment-editor:content-height', '180');

    const articleWrapper = mountEditor('comment-editor:article-content-height');
    await flushPromises();
    expect((articleWrapper.get('[data-testid="comment-editor-content"]').element as HTMLElement).style.height).toBe('240px');
    articleWrapper.unmount();

    const replyWrapper = mountEditor('comment-editor:reply-content-height');
    await flushPromises();
    expect((replyWrapper.get('[data-testid="comment-editor-content"]').element as HTMLElement).style.height).toBe('320px');
    replyWrapper.unmount();
  });

  it('persists resized height to the provided storage key only', async () => {
    const wrapper = mountEditor('comment-editor:reply-content-height');
    await flushPromises();

    const contentEl = wrapper.get('[data-testid="comment-editor-content"]').element as HTMLElement;
    vi.spyOn(contentEl, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 333,
      width: 0,
      height: 333,
      toJSON: () => ({}),
    } as DOMRect);

    resizeObservers[0]?.trigger();
    vi.advanceTimersByTime(201);

    expect(window.localStorage.getItem('comment-editor:reply-content-height')).toBe('333');
    expect(window.localStorage.getItem('comment-editor:article-content-height')).toBeNull();

    wrapper.unmount();
  });
});
