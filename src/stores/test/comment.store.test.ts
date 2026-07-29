import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import useCommentStore from '../comment.store';

describe('comment.store reply trace', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps only one active reply trace across comment threads', () => {
    const store = useCommentStore();

    expect(store.activeTrace).toBeNull();

    store.setActiveTrace({ commentId: 10, sourceReplyId: 101, targetReplyId: 100 });
    expect(store.activeTrace).toEqual({ commentId: 10, sourceReplyId: 101, targetReplyId: 100 });

    store.setActiveTrace({ commentId: 20, sourceReplyId: 202, targetReplyId: 201 });
    expect(store.activeTrace).toEqual({ commentId: 20, sourceReplyId: 202, targetReplyId: 201 });

    store.clearActiveTrace();
    expect(store.activeTrace).toBeNull();
  });

  it('clears the active trace together with other comment UI state', () => {
    const store = useCommentStore();
    store.setActiveTrace({ commentId: 10, sourceReplyId: 101, targetReplyId: 100 });

    store.closeAllForms();

    expect(store.activeTrace).toBeNull();
  });
});
