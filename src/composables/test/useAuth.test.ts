import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuth } from '../useAuth';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('does not treat restored cached user data as current user while auth is still checking', () => {
    const rootStore = useRootStore();
    const userStore = useUserStore();

    userStore.token = 'cached-token';
    userStore.userInfo = { id: 7, name: 'cached user' };
    (rootStore as { authStatus?: string }).authStatus = 'checking';

    const { isCurrentUser } = useAuth();

    expect(isCurrentUser(7)).toBe(false);
  });
});
