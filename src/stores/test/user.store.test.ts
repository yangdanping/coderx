import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { follow, getFollow, showSuccess, showWarn, showFail } = vi.hoisted(() => ({
  follow: vi.fn(),
  getFollow: vi.fn(),
  showSuccess: vi.fn(),
  showWarn: vi.fn(),
  showFail: vi.fn(),
}));

vi.mock('@/router', () => ({
  default: {
    go: vi.fn(),
  },
}));

vi.mock('@/service/user/user.request', () => ({
  userLogin: vi.fn(),
  userRegister: vi.fn(),
  getUserInfoById: vi.fn(),
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

vi.mock('@/utils', () => ({
  LocalCache: {
    getCache: vi.fn(),
    setCache: vi.fn(),
    removeCache: vi.fn(),
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
});
