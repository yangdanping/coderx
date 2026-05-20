import { describe, expect, it, vi } from 'vitest';

import { handleBeforeEachNavigation } from '../index';

type PartialRoute = {
  path: string;
  meta?: Record<string, unknown>;
  matched?: Array<{ meta?: Record<string, unknown> }>;
};

describe('handleBeforeEachNavigation', () => {
  it('opens the login dialog and redirects first protected visits to home when the user is unauthenticated', async () => {
    const toggleLoginDialog = vi.fn();
    const initArticle = vi.fn();
    const resetComment = vi.fn();
    const setDocumentTitle = vi.fn();

    const result = await handleBeforeEachNavigation({
      to: {
        path: '/edit',
        meta: { requiresAuth: true, title: '写文章' },
        matched: [{ meta: { title: '写文章' } }],
      } as PartialRoute,
      from: {
        path: '',
        matched: [],
      } as PartialRoute,
      rootStore: {
        showLoginDialog: false,
        toggleLoginDialog,
        checkAuthAction: vi.fn(),
      },
      articleStore: {
        initArticle,
      },
      commentStore: {
        $reset: resetComment,
      },
      token: '',
      hasVerifiedOnce: false,
      setDocumentTitle,
    });

    expect(toggleLoginDialog).toHaveBeenCalledTimes(1);
    expect(setDocumentTitle).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      navigationResult: { name: 'home' },
      hasVerifiedOnce: false,
    });
    expect(initArticle).not.toHaveBeenCalled();
    expect(resetComment).not.toHaveBeenCalled();
  });

  it('verifies protected routes, blocks invalid tokens, and records that verification already happened', async () => {
    const checkAuthAction = vi.fn().mockResolvedValue(false);

    const result = await handleBeforeEachNavigation({
      to: {
        path: '/edit',
        meta: { requiresAuth: true, title: '写文章' },
        matched: [{ meta: { title: '写文章' } }],
      } as PartialRoute,
      from: {
        path: '/',
        matched: [{ meta: { title: '首页' } }],
      } as PartialRoute,
      rootStore: {
        showLoginDialog: false,
        toggleLoginDialog: vi.fn(),
        checkAuthAction,
      },
      articleStore: {
        initArticle: vi.fn(),
      },
      commentStore: {
        $reset: vi.fn(),
      },
      token: 'valid.jwt.token',
      hasVerifiedOnce: false,
      setDocumentTitle: vi.fn(),
      isTokenExpiringSoon: vi.fn(() => false),
    });

    expect(checkAuthAction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      navigationResult: false,
      hasVerifiedOnce: true,
    });
  });

  it('verifies cached tokens on first public-route visits without blocking the public page when invalid', async () => {
    const checkAuthAction = vi.fn().mockResolvedValue(false);
    const toggleLoginDialog = vi.fn();

    const result = await handleBeforeEachNavigation({
      to: {
        path: '/user/12',
        meta: { title: '用户主页' },
        matched: [{ meta: { title: '用户主页' } }],
      } as PartialRoute,
      from: {
        path: '',
        matched: [],
      } as PartialRoute,
      rootStore: {
        showLoginDialog: false,
        toggleLoginDialog,
        checkAuthAction,
      },
      articleStore: {
        initArticle: vi.fn(),
      },
      commentStore: {
        $reset: vi.fn(),
      },
      token: 'expired.jwt.token',
      hasVerifiedOnce: false,
      setDocumentTitle: vi.fn(),
      isTokenExpiringSoon: vi.fn(() => false),
    });

    expect(checkAuthAction).toHaveBeenCalledTimes(1);
    expect(toggleLoginDialog).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      navigationResult: undefined,
      hasVerifiedOnce: true,
    });
  });
});
