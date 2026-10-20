import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useUserStore from '@/stores/user.store';
import useRootStore from '@/stores/index.store';
import UserFollow from '../UserFollow.vue';

const api = vi.hoisted(() => ({ getFollow: vi.fn() }));
vi.mock('@/router', () => ({ default: { go: vi.fn() } }));
vi.mock('@/service/user/user.request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/user/user.request')>()),
  getFollow: api.getFollow,
}));

describe('personal space follow-list identity', () => {
  it('loads the viewer relationships and updates them when the account changes', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/user/:userId', component: { template: '<div />' } }] });
    await router.push('/user/2?tabName=关注');
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        user: {
          token: 'first-token',
          userInfo: { id: 99 },
          profile: { id: 2 },
        },
      },
    });
    const wrapper = mount(UserFollow, { global: { plugins: [router, pinia], stubs: { Tabs: true, TabItem: true, UserFollowItem: true } } });
    const store = useUserStore(pinia);
    expect(store.getMyFollowAction).toHaveBeenCalledWith(99);
    store.userInfo = { id: 88 };
    store.token = 'second-token';
    await flushPromises();
    expect(store.getMyFollowAction).toHaveBeenCalledWith(88);
    wrapper.unmount();
  });
});

describe('personal space follow-list session recovery', () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    api.getFollow.mockReset().mockResolvedValue({ code: 0, data: { following: [], follower: [] } });
  });
  afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

  async function setup(profileId: number) {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/user/:userId', component: { template: '<div />' } }] });
    await router.push(`/user/${profileId}?tabName=关注`);
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useUserStore(pinia);
    store.profile = { id: profileId };
    store.profileStatus = 'ready';

    const mountList = () => {
      const wrapper = mount(UserFollow, {
        global: {
          plugins: [router, pinia],
          stubs: {
            Avatar: true,
            Tabs: { template: '<div><slot /></div>' },
            TabItem: true,
            ElButton: { props: ['loading'], template: '<button :disabled="loading"><slot /></button>' },
          },
        },
      });
      wrappers.push(wrapper);
      return wrapper;
    };

    return { store, rootStore: useRootStore(pinia), mountList };
  }

  it('shows the existing follow after login overlaps the profile request', async () => {
    let finish!: (value: unknown) => void;
    api.getFollow.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { store, rootStore, mountList } = await setup(99);
    const request = store.getFollowAction(99);
    const wrapper = mountList();

    store.token = 'oauth-token';
    store.userInfo = { id: 99 };
    rootStore.setAuthStatus('authenticated');
    await flushPromises();
    finish({ code: 0, data: { following: [{ id: 10, name: '已关注的人' }], follower: [] } });
    await request;
    await flushPromises();

    expect(api.getFollow).toHaveBeenCalledTimes(1);
    expect(wrapper.get('button').text()).toBe('已关注');
  });

  it('keeps another user public list visible when authentication expires', async () => {
    const { store, rootStore, mountList } = await setup(2);
    store.token = 'expired-token';
    store.userInfo = { id: 99 };
    rootStore.setAuthStatus('authenticated');
    store.followInfoCache[2] = { data: { following: [{ id: 10, name: '公开关注对象' }], follower: [] }, timestamp: Date.now() };
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).toContain('公开关注对象');

    store.logOut({ prompt: true });
    await flushPromises();

    expect(rootStore.showLoginDialog).toBe(true);
    expect(wrapper.text()).toContain('公开关注对象');
    expect(wrapper.text()).not.toContain('没有关注别人');
    expect(store.followCount('following')).toBe(1);
  });
});
