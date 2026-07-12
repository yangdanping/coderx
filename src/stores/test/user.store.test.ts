import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { follow, getFollow, userLogin, getUserInfoById, showSuccess, showWarn, showFail, removeCachesByPrefix, getCache, routerGo, migrateGuestTagOrderToAccount } = vi.hoisted(
  () => ({
    follow: vi.fn(),
    getFollow: vi.fn(),
    userLogin: vi.fn(),
    getUserInfoById: vi.fn(),
    showSuccess: vi.fn(),
    showWarn: vi.fn(),
    showFail: vi.fn(),
    removeCachesByPrefix: vi.fn(),
    getCache: vi.fn(),
    routerGo: vi.fn(),
    migrateGuestTagOrderToAccount: vi.fn(),
  }),
);

vi.mock('@/router', () => ({
  default: {
    go: routerGo,
  },
}));

vi.mock('@/service/user/user.request', () => ({
  userLogin,
  userRegister: vi.fn(),
  getUserInfoById,
  follow,
  getFollow,
  updateProfile: vi.fn(),
  reportUser: vi.fn(),
}));

vi.mock('@/service/collect/collect.request', () => ({
  getCollect: vi.fn(),
  addCollect: vi.fn(),
  addToCollect: vi.fn(),
  removeCollectArticle: vi.fn(),
  updateCollect: vi.fn(),
  removeCollect: vi.fn(),
}));

vi.mock('@/service/file/file.request', () => ({
  uploadAvatar: vi.fn(),
  deleteOldAvatar: vi.fn(),
}));

vi.mock('@/service/article/tagOrderPreference', () => ({
  migrateGuestTagOrderToAccount,
}));

vi.mock('@/utils', () => ({
  LocalCache: {
    getCache,
    setCache: vi.fn(),
    removeCache: vi.fn(),
    removeCachesByPrefix,
  },
  Msg: {
    showSuccess,
    showWarn,
    showFail,
  },
  emitter: {
    emit: vi.fn(),
  },
}));

import useUserStore from '../user.store';

describe('user.store followAction', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    follow.mockReset();
    getFollow.mockReset();
    showSuccess.mockReset();
    showWarn.mockReset();
    showFail.mockReset();
    removeCachesByPrefix.mockReset();
    userLogin.mockReset();
    getUserInfoById.mockReset();
    getCache.mockReset();
    routerGo.mockReset();
    migrateGuestTagOrderToAccount.mockReset();
    getFollow.mockResolvedValue({ code: 0, data: { following: [], follower: [] } });
  });

  it('shows success when the follow endpoint reports a new follow', async () => {
    follow.mockResolvedValue({
      code: 0,
      data: {
        isFollowed: true,
        action: 'followed',
      },
    });
    const store = useUserStore();
    store.userInfo = { id: 99 } as any;

    await store.followAction(10);

    expect(showSuccess).toHaveBeenCalledWith('关注成功');
    expect(showWarn).not.toHaveBeenCalled();
  });

  it('shows unfollow feedback when the follow endpoint reports an unfollow', async () => {
    follow.mockResolvedValue({
      code: 0,
      data: {
        isFollowed: false,
        action: 'unfollowed',
      },
    });
    const store = useUserStore();
    store.userInfo = { id: 99 } as any;

    await store.followAction(10);

    expect(showWarn).toHaveBeenCalledWith('取关成功');
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('clears local AI chat cache when auth state is cleared', () => {
    const store = useUserStore();

    store.clearAuthState();

    expect(removeCachesByPrefix).toHaveBeenCalledWith('coderx_ai_chat_');
  });

  it('awaits guest tag-order migration before refreshing after login', async () => {
    let finishMigration!: () => void;
    const migration = new Promise<'migrated'>((resolve) => {
      finishMigration = () => resolve('migrated');
    });
    userLogin.mockResolvedValue({ code: 0, data: { id: 7, token: 'token' } });
    getUserInfoById.mockResolvedValue({ code: 0, data: { id: 7, name: 'Coder' } });
    getCache.mockReturnValue('token');
    migrateGuestTagOrderToAccount.mockReturnValue(migration);
    const store = useUserStore();

    const pendingLogin = store.loginAction({ name: 'coder', password: 'secret' });
    await Promise.resolve();
    await Promise.resolve();

    expect(routerGo).not.toHaveBeenCalled();
    finishMigration();
    await pendingLogin;

    expect(migrateGuestTagOrderToAccount).toHaveBeenCalledOnce();
    expect(routerGo).toHaveBeenCalledWith(0);
  });
});
