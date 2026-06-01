import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const route = reactive({
  params: {
    articleId: '12',
  },
});

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => route,
  };
});

vi.mock('@/composables/useCommentList', () => ({
  useAddComment: () => ({
    mutateAsync: vi.fn(),
  }),
  useAddReply: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/utils', () => ({
  Msg: {
    showFail: vi.fn(),
    showInfo: vi.fn(),
  },
  emitter: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('@/components/tiptap-editor-comment/TiptapEditorComment.vue', () => ({
  default: defineComponent({
    props: {
      heightStorageKey: {
        type: String,
        default: '',
      },
    },
    setup(props, { slots }) {
      return () =>
        h(
          'section',
          {
            class: 'comment-editor-stub',
            'data-height-storage-key': props.heightStorageKey,
          },
          slots.actions?.(),
        );
    },
  }),
}));

import CommentForm from '../CommentForm.vue';

const mountForm = (props: Record<string, unknown> = {}) =>
  mount(CommentForm, {
    props,
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            user: {
              userInfo: {
                id: 1,
                name: 'ydp',
              },
            },
            article: {
              article: {
                id: 12,
                status: 0,
              },
            },
            comment: {
              activeReplyId: null,
            },
          },
        }),
      ],
      stubs: {
        Avatar: true,
        ElButton: true,
      },
    },
  });

describe('CommentForm editor height storage', () => {
  it('uses separate height storage keys for article comments and replies', () => {
    const articleForm = mountForm();
    expect(articleForm.get('.comment-editor-stub').attributes('data-height-storage-key')).toBe('comment-editor:article-content-height');
    articleForm.unmount();

    const replyForm = mountForm({
      isReply: true,
      commentId: 101,
    });
    expect(replyForm.get('.comment-editor-stub').attributes('data-height-storage-key')).toBe('comment-editor:reply-content-height');
    replyForm.unmount();
  });
});
