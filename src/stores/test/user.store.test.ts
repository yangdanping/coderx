import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { follow, getFollow, getCollect, userLogin, getUserInfoById, showSuccess, showWarn, showFail, removeCachesByPrefix, getCache, routerGo, migrateGuestTagOrderToAccount } =
  vi.hoisted(() => ({
    follow: vi.fn(),
    getFollow: vi.fn(),
    getCollect: vi.fn(),
    userLogin: vi.fn(),
    getUserInfoById: vi.fn(),
    showSuccess: vi.fn(),
    showWarn: vi.fn(),
    showFail: vi.fn(),
    removeCachesByPrefix: vi.fn(),
    getCache: vi.fn(),
    routerGo: vi.fn(),
    migrateGuestTagOrderToAccount: vi.fn(),
  }));

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
  getCollect,
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

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('user.store followAction', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    follow.mockReset();
    getFollow.mockReset();
    getCollect.mockReset();
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

  it('keeps the latest profile when two users load out of order', async () => {
    const first = deferred();
    getUserInfoById.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ code: 0, data: { id: 2, name: 'second' } });
    const store = useUserStore();
    const oldRequest = store.getProfileAction('1');
    await store.getProfileAction('2');
    first.resolve({ code: 0, data: { id: 1, name: 'first' } });
    await oldRequest;
    expect(store.profile.id).toBe(2);
  });

  it('invalidates profile and collection requests when leaving a profile', async () => {
    const profile = deferred();
    const collections = deferred();
    getUserInfoById.mockReturnValue(profile.promise);
    getCollect.mockReturnValue(collections.promise);
    const store = useUserStore();
    const profileRequest = store.getProfileAction('1');
    const collectionRequest = store.getCollectAction(1);
    store.initProfile();
    profile.resolve({ code: 0, data: { id: 1 } });
    collections.resolve({ code: 0, data: [{ id: 7, name: '旧收藏夹' }] });
    await Promise.all([profileRequest, collectionRequest]);
    expect(store.profile).toEqual({});
    expect(store.collects).toEqual([]);
  });

  it('clears the previous profile on failure and supports retry', async () => {
    const store = useUserStore();
    store.profile = { id: 1 };
    getUserInfoById.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ code: 0, data: { id: 2 } });
    await expect(store.getProfileAction('2')).resolves.toBeUndefined();
    expect(store.profile).toEqual({});
    expect(store.profileStatus).toBe('error');
    await store.getProfileAction('2');
    expect(store.profile.id).toBe(2);
    expect(store.profileStatus).toBe('ready');
  });

  it('rejects invalid profile IDs and treats a missing profile as an error', async () => {
    const store = useUserStore();
    await store.getProfileAction('invalid');
    expect(getUserInfoById).not.toHaveBeenCalled();
    expect(store.profileStatus).toBe('error');
    getUserInfoById.mockResolvedValue({ code: 0, data: null });
    await store.getProfileAction('2');
    expect(store.profile).toEqual({});
    expect(store.profileStatus).toBe('error');
  });

  it('keeps collections scoped to the latest requested user', async () => {
    const old = deferred();
    getCollect.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ code: 0, data: [{ id: 8, name: '新收藏夹' }] });
    const store = useUserStore();
    store.collects = [{ id: 7, name: '旧收藏夹', count: [] }];
    const oldRequest = store.getCollectAction(1);
    expect(store.collects).toEqual([]);
    await store.getCollectAction(2);
    old.resolve({ code: 0, data: [{ id: 7, name: '旧收藏夹' }] });
    await oldRequest;
    expect(store.collects.map((item) => item.id)).toEqual([8]);
  });

  it('uses the logged-in viewer relationships for both follow-list tabs', () => {
    const store = useUserStore();
    store.token = 'token';
    store.userInfo = { id: 99 };
    store.profile = { id: 2 };
    store.followInfoCache[2] = { data: { following: [{ id: 10 }], follower: [{ id: 11 }] }, timestamp: Date.now() };
    store.myFollowInfo = { following: [{ id: 11 }], follower: [] };
    expect(store.isUserFollowed(10, 'following')).toBe(false);
    expect(store.isUserFollowed(11, 'following')).toBe(true);
    expect(store.isUserFollowed(11, 'follower')).toBe(true);
    store.token = '';
    expect(store.isUserFollowed(11, 'follower')).toBe(false);
  });

  it('refreshes both participants after following without changing the viewed profile', async () => {
    const store = useUserStore();
    store.token = 'token';
    store.userInfo = { id: 99 };
    store.profile = { id: 2 };
    follow.mockResolvedValue({ code: 0, data: { isFollowed: true, action: 'followed' } });
    getFollow.mockImplementation(async (id) => ({ code: 0, data: id === 99 ? { following: [{ id: 10 }] } : { follower: [{ id: 99 }] } }));
    await store.followAction(10, true);
    expect(getFollow).toHaveBeenCalledWith(10);
    expect(getFollow).toHaveBeenCalledWith(99);
    expect(store.myFollowInfo.following).toEqual([{ id: 10 }]);
    expect(store.isFollowedById(10)).toBe(true);
    expect(store.profile.id).toBe(2);
  });

  it('does not let a stale follow read overwrite a forced refresh after a mutation', async () => {
    const old = deferred();
    const store = useUserStore();
    store.token = 'token';
    store.userInfo = { id: 99 };
    getFollow.mockReturnValueOnce(old.promise).mockResolvedValue({ code: 0, data: { follower: [{ id: 99 }] } });
    const pending = store.getFollowAction(10);
    await store.getFollowAction(10, true);
    old.resolve({ code: 0, data: { follower: [] } });
    await pending;
    expect(store.isFollowedById(10)).toBe(true);
    expect(store.pendingFollowRequests).toEqual([]);
  });

  it('does not restore an old account follow state after logout', async () => {
    const pending = deferred();
    const store = useUserStore();
    store.token = 'old-token';
    store.userInfo = { id: 99 };
    getFollow.mockReturnValue(pending.promise);
    const request = store.getMyFollowAction(99);
    store.clearAuthState();
    pending.resolve({ code: 0, data: { following: [{ id: 10 }] } });
    await request;
    expect(store.myFollowInfo).toEqual({});
  });

  it('keeps public follow lists visible after a non-refresh logout', () => {
    const store = useUserStore();
    const publicInfo = { following: [{ id: 10 }], follower: [{ id: 11 }] };
    store.token = 'expired-token';
    store.userInfo = { id: 99 };
    store.profile = { id: 2 };
    store.profileStatus = 'ready';
    store.followInfoCache[2] = { data: publicInfo, timestamp: Date.now() };
    store.myFollowInfo = { following: [{ id: 10 }] };

    store.logOut({ prompt: true });

    expect(store.token).toBe('');
    expect(store.myFollowInfo).toEqual({});
    expect(store.profileStatus).toBe('ready');
    expect(store.followInfo).toEqual(publicInfo);
    expect(store.followCount('following')).toBe(1);
    expect(store.followCount('follower')).toBe(1);
  });

  it('finishes a public follow read when the session expires while it is loading', async () => {
    const pending = deferred();
    const store = useUserStore();
    store.token = 'expired-token';
    store.userInfo = { id: 99 };
    store.profile = { id: 2 };
    getFollow.mockReturnValue(pending.promise);
    const request = store.getFollowAction(2);

    store.logOut({ prompt: true });
    pending.resolve({ code: 0, data: { following: [{ id: 10 }], follower: [] } });
    await request;

    expect(store.followInfo.following).toEqual([{ id: 10 }]);
    expect(store.myFollowInfo).toEqual({});
    expect(store.pendingFollowRequests).toEqual([]);
  });

  it('fills the current viewer relationships when a guest read overlaps OAuth login', async () => {
    const pending = deferred();
    const store = useUserStore();
    store.profile = { id: 99 };
    getFollow.mockReturnValue(pending.promise);
    getUserInfoById.mockResolvedValue({ code: 0, data: { id: 99 } });
    migrateGuestTagOrderToAccount.mockResolvedValue('migrated');
    const guestRequest = store.getFollowAction(99);

    await store.loginWithOAuthTokenAction({ token: 'oauth-token', userId: 99 });
    await store.getMyFollowAction(99);
    pending.resolve({ code: 0, data: { following: [{ id: 10 }], follower: [] } });
    await guestRequest;

    expect(getFollow).toHaveBeenCalledTimes(1);
    expect(store.isUserFollowed(10, 'following')).toBe(true);
    expect(store.myFollowCount('following')).toBe(1);
  });

  it('keeps another account public read from replacing the current viewer relationships', async () => {
    const pending = deferred();
    const store = useUserStore();
    store.token = 'first-token';
    store.userInfo = { id: 99 };
    getFollow.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ code: 0, data: { following: [{ id: 20 }], follower: [] } });
    const oldRequest = store.getMyFollowAction(99);

    store.clearAuthState();
    store.token = 'second-token';
    store.userInfo = { id: 88 };
    await store.getMyFollowAction(88);
    pending.resolve({ code: 0, data: { following: [{ id: 10 }], follower: [] } });
    await oldRequest;

    expect(store.myFollowInfo.following).toEqual([{ id: 20 }]);
    expect(store.isUserFollowed(10, 'following')).toBe(false);
    expect(store.isUserFollowed(20, 'following')).toBe(true);
  });

  it('refreshes a successful follow that finishes after logout before the account logs in again', async () => {
    const pending = deferred();
    const store = useUserStore();
    store.token = 'first-token';
    store.userInfo = { id: 99 };
    store.profile = { id: 10 };
    store.followInfoCache[10] = { data: { following: [], follower: [] }, timestamp: Date.now() };
    store.followInfoCache[99] = { data: { following: [], follower: [] }, timestamp: Date.now() };
    follow.mockReturnValue(pending.promise);
    getFollow.mockImplementation(async (id) => ({
      code: 0,
      data: id === 99 ? { following: [{ id: 10 }], follower: [] } : { following: [], follower: [{ id: 99 }] },
    }));
    const request = store.followAction(10);

    store.clearAuthState();
    pending.resolve({ code: 0, data: { action: 'followed' } });
    await request;

    expect(store.followInfo.follower).toEqual([{ id: 99 }]);
    expect(store.myFollowInfo).toEqual({});
    expect(showSuccess).not.toHaveBeenCalled();
    store.token = 'new-token';
    store.userInfo = { id: 99 };
    await store.getMyFollowAction(99);
    expect(store.isUserFollowed(10, 'following')).toBe(true);
  });

  it('does not unlock another account mutation when an old account follow finishes', async () => {
    const previous = deferred();
    const current = deferred();
    const store = useUserStore();
    store.token = 'first-token';
    store.userInfo = { id: 99 };
    follow.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const previousRequest = store.followAction(10);

    store.clearAuthState();
    store.token = 'second-token';
    store.userInfo = { id: 88 };
    store.myFollowInfo = { following: [{ id: 20 }], follower: [] };
    const currentRequest = store.followAction(10);
    previous.resolve({ code: 0, data: { action: 'followed' } });
    await previousRequest;

    expect(store.pendingFollowMutations).toEqual([10]);
    expect(store.myFollowInfo.following).toEqual([{ id: 20 }]);
    expect(showSuccess).not.toHaveBeenCalled();
    current.resolve({ code: 1, msg: '无法关注' });
    await currentRequest;
    expect(store.pendingFollowMutations).toEqual([]);
    expect(showFail).toHaveBeenCalledWith('无法关注');
  });

  it('does not issue duplicate follow toggles while a mutation is pending', async () => {
    const pending = deferred();
    const store = useUserStore();
    store.token = 'token';
    store.userInfo = { id: 99 };
    follow.mockReturnValue(pending.promise);
    const first = store.followAction(10);
    const second = store.followAction(10);
    expect(follow).toHaveBeenCalledTimes(1);
    pending.resolve({ code: 0, data: { action: 'followed' } });
    await Promise.all([first, second]);
  });

  it('ignores an older failed profile request after another profile is ready', async () => {
    const old = deferred();
    getUserInfoById.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ code: 0, data: { id: 2 } });
    const store = useUserStore();
    const pending = store.getProfileAction('1');
    await store.getProfileAction('2');
    old.reject(new Error('old network failure'));
    await pending;
    expect(store.profile.id).toBe(2);
    expect(store.profileStatus).toBe('ready');
    expect(store.profileError).toBe('');
  });

  it('preserves relationships on a rejected follow and unlocks retry', async () => {
    const store = useUserStore();
    store.token = 'token';
    store.userInfo = { id: 99 };
    store.myFollowInfo = { following: [{ id: 10 }] };
    follow.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ code: 1, msg: '无法关注' });
    await store.followAction(10);
    expect(store.pendingFollowMutations).toEqual([]);
    expect(store.isUserFollowed(10, 'following')).toBe(true);
    await store.followAction(10);
    expect(follow).toHaveBeenCalledTimes(2);
    expect(getFollow).not.toHaveBeenCalled();
    expect(store.pendingFollowMutations).toEqual([]);
  });

  it('does not repopulate collections after logging out', async () => {
    const old = deferred();
    getCollect.mockReturnValue(old.promise);
    const store = useUserStore();
    const pending = store.getCollectAction(99);
    store.clearAuthState();
    old.resolve({ code: 0, data: [{ id: 7, name: '已退出用户的收藏夹' }] });
    await pending;
    expect(store.collects).toEqual([]);
  });
});
