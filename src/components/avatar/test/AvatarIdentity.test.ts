import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const route = {
  path: '/article/1',
  query: {},
};
const router = {
  push: vi.fn(),
};

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => router,
  };
});

import Avatar from '../Avatar.vue';

const ElPopover = defineComponent({
  name: 'ElPopover',
  setup(_, { slots }) {
    return () => h('div', { 'data-test': 'avatar-popover' }, [slots.default?.(), slots.reference?.()]);
  },
});

const ElAvatar = defineComponent({
  name: 'ElAvatar',
  props: ['src', 'alt', 'size'],
  setup(props, { attrs }) {
    return () => h('img', { ...attrs, src: props.src, alt: props.alt });
  },
});

const RouterLink = defineComponent({
  name: 'RouterLink',
  props: ['to'],
  setup(_, { attrs, slots }) {
    return () => h('a', attrs, slots.default?.());
  },
});

function mountAvatar(nickname?: string | null) {
  return mount(Avatar, {
    props: {
      info: {
        id: 7,
        name: 'ydp',
        nickname,
        avatarUrl: '/avatar.png',
        sex: '男',
        career: '前端',
      },
      size: 40,
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            root: {
              authStatus: 'authenticated',
              windowInfo: { width: 1440, height: 900 },
            },
            user: {
              token: 'token',
              userInfo: { id: 42, name: 'current-user' },
              profile: {},
              followInfoCache: {
                7: {
                  data: { following: [], follower: [] },
                  timestamp: Date.now(),
                },
              },
              pendingFollowRequests: [],
              myFollowInfo: {},
              collects: [],
            },
            online: {
              onlineUsers: [],
            },
          },
        }),
      ],
      stubs: {
        ElPopover,
        ElAvatar,
        ElTag: defineComponent({
          setup(_, { slots }) {
            return () => h('span', slots.default?.());
          },
        }),
        RouterLink,
        AnimatedNumber: true,
        FollowButton: true,
      },
    },
  });
}

describe('Avatar hover identity', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  it('shows nickname above @account name and uses nickname in accessible labels', () => {
    const wrapper = mountAvatar('小杨');

    expect(wrapper.get('[data-test="avatar-display-name"]').text()).toBe('小杨');
    expect(wrapper.get('[data-test="avatar-account-name"]').text()).toBe('@ydp');
    expect(wrapper.get('.avatar-link').attributes('aria-label')).toBe('查看小杨的主页');
    expect(wrapper.get('img').attributes('alt')).toBe('小杨的头像');
  });

  it('falls back to account name when nickname is absent', () => {
    const wrapper = mountAvatar(null);

    expect(wrapper.get('[data-test="avatar-display-name"]').text()).toBe('ydp');
    expect(wrapper.get('[data-test="avatar-account-name"]').text()).toBe('@ydp');
  });
});
