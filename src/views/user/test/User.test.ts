import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import User from '../User.vue';
import useUserStore from '@/stores/user.store';

const api = vi.hoisted(() => ({ profile: vi.fn(), follow: vi.fn() }));
vi.mock('@/router', () => ({ default: { go: vi.fn() } }));
vi.mock('@/service/user/user.request', () => ({
  userLogin: vi.fn(),
  userRegister: vi.fn(),
  follow: vi.fn(),
  updateProfile: vi.fn(),
  reportUser: vi.fn(),
  getLiked: vi.fn(),
  checkAuth: vi.fn(),
  getUserInfoById: api.profile,
  getFollow: api.follow,
}));

const wrappers: VueWrapper[] = [];
async function setup(path = '/user/1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/user/:userId', component: User },
      { path: '/', component: { template: '<div>Home</div>' } },
    ],
  });
  await router.push(path);
  const pinia = createPinia();
  const wrapper = mount(RouterView, {
    global: {
      plugins: [pinia, router],
      stubs: { UserProfile: { props: ['profile'], template: '<div data-test="profile">{{ profile.name }}</div>' } },
    },
  });
  wrappers.push(wrapper);
  return { wrapper, router, store: useUserStore(pinia) };
}

describe('personal space loading lifecycle', () => {
  beforeEach(() => {
    api.profile.mockReset();
    api.follow.mockReset().mockResolvedValue({ code: 0, data: { following: [], follower: [] } });
  });
  afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

  it('shows loading instead of an empty or stale profile, then loads once', async () => {
    let finish!: (value: unknown) => void;
    api.profile.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { wrapper } = await setup();
    expect(wrapper.find('[data-test="profile"]').exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toContain('加载');
    finish({ code: 0, data: { id: 1, name: '用户一' } });
    await flushPromises();
    expect(wrapper.get('[data-test="profile"]').text()).toBe('用户一');
    expect(api.profile).toHaveBeenCalledTimes(1);
  });

  it('provides retry on failure and preserves the requested tab URL', async () => {
    api.profile.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ code: 0, data: { id: 1, name: '用户一' } });
    const { wrapper, router } = await setup('/user/1?tabName=收藏');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('加载失败');
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-test="profile"]').text()).toBe('用户一');
    expect(router.currentRoute.value.query.tabName).toBe('收藏');
  });

  it('clears previous content while switching users and on leaving the page', async () => {
    api.profile.mockResolvedValueOnce({ code: 0, data: { id: 1, name: '用户一' } });
    const { wrapper, router, store } = await setup();
    await flushPromises();
    let finish!: (value: unknown) => void;
    api.profile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await router.push('/user/2');
    await flushPromises();
    expect(wrapper.find('[data-test="profile"]').exists()).toBe(false);
    await router.push('/');
    finish({ code: 0, data: { id: 2, name: '已离开的用户二' } });
    await flushPromises();
    expect(store.profile).toEqual({});
    expect(wrapper.text()).toBe('Home');
  });

  it('rejects invalid user routes without making any requests', async () => {
    const { wrapper } = await setup('/user/invalid');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('无效');
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.follow).not.toHaveBeenCalled();
  });
});
