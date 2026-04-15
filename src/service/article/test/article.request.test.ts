import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('@/service', () => ({
  default: {
    post: postMock,
    put: putMock,
  },
}));

import { createArticle, updateArticle } from '../article.request';

describe('article.request', () => {
  beforeEach(() => {
    postMock.mockReset();
    putMock.mockReset();
  });

  it('forwards draftId in the create article body', () => {
    const payload = {
      title: '新文章',
      contentJson: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      draftId: 7,
    };

    createArticle(payload);

    expect(postMock).toHaveBeenCalledWith({
      url: '/article',
      data: {
        title: '新文章',
        contentJson: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        draftId: 7,
      },
    });
  });

  it('does not forward legacy content in the create article body', () => {
    const payload = {
      title: '新文章',
      content: '<p>正文</p>',
      contentJson: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      draftId: 7,
    };

    createArticle(payload);

    expect(postMock).toHaveBeenCalledWith({
      url: '/article',
      data: {
        title: '新文章',
        contentJson: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        draftId: 7,
      },
    });
  });

  it('forwards draftId in the update article body', () => {
    updateArticle({
      articleId: 42,
      title: '更新标题',
      content: '<p>更新正文</p>',
      draftId: 7,
    });

    expect(putMock).toHaveBeenCalledWith({
      url: '/article/42',
      data: {
        title: '更新标题',
        contentJson: undefined,
        draftId: 7,
      },
    });
  });

  it('does not forward legacy content in the update article body', () => {
    updateArticle({
      articleId: 42,
      title: '更新标题',
      content: '<p>更新正文</p>',
      contentJson: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      draftId: 7,
    });

    expect(putMock).toHaveBeenCalledWith({
      url: '/article/42',
      data: {
        title: '更新标题',
        contentJson: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        draftId: 7,
      },
    });
  });
});
