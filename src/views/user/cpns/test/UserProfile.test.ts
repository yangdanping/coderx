import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const route = reactive({
  params: {
    userId: '99',
  },
  query: {
    tabName: '最近浏览',
  } as Record<string, string>,
  path: '/user/99',
});

const router = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => router,
  };
});

const tabsStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const tabItemStub = defineComponent({
  props: {
    name: {
      type: String,
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () => h('button', { 'data-tab-name': props.name }, props.label);
  },
});

import useArticleStore from '@/stores/article.store';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import UserProfile from '../UserProfile.vue';

function mountIdentityProfile(profile: { id: number; name: string; nickname?: string | null; sex: string }, width = 1440) {
  route.query = {};

  return mount(UserProfile, {
    props: { profile },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            root: {
              authStatus: 'authenticated',
              windowInfo: { width, height: 900 },
            },
            user: {
              token: 'token',
              userInfo: { id: 42, name: 'current-user' },
              profile,
              followInfoCache: {
                [profile.id]: {
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
            article: {
              articles: {},
              recommends: [],
              article: {},
              tags: [],
              activeTagId: '综合',
              activeOrder: 'date',
            },
            comment: {
              userComments: [],
              userLikedCommentIdList: [],
              activeReplyId: null,
              activeEditId: null,
            },
            history: {},
          },
        }),
      ],
      stubs: {
        UserAvatar: true,
        UserProfileMenu: true,
        FollowButton: true,
        Icon: true,
        Tabs: tabsStub,
        TabItem: tabItemStub,
        ElTag: true,
        ElButton: true,
      },
    },
  });
}

describe('UserProfile', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    route.params.userId = '99';
    route.path = '/user/99';
    route.query = { tabName: '最近浏览' };
  });

  it('normalizes unauthorized deep links without prefetching profile article server state', async () => {
    mount(UserProfile, {
      props: {
        profile: {
          id: 99,
          name: 'other-user',
          sex: '男',
        },
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              root: {
                showLoginDialog: false,
                showProfileDialog: false,
                profileEditForm: {},
                windowInfo: { width: 1440, height: 900 },
              },
              user: {
                token: 'token',
                userInfo: { id: 42, name: 'current-user' },
                profile: { id: 99, name: 'other-user', sex: '男' },
                followInfoCache: {
                  99: {
                    data: {
                      following: [],
                      follower: [],
                    },
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
              article: {
                articles: {},
                recommends: [],
                article: {},
                tags: [],
                activeTagId: '综合',
                activeOrder: 'date',
              },
              comment: {
                userComments: [],
                userLikedCommentIdList: [],
                activeReplyId: null,
                activeEditId: null,
              },
              history: {},
            },
          }),
        ],
        stubs: {
          UserAvatar: true,
          UserProfileMenu: true,
          FollowButton: true,
          Icon: true,
          Tabs: tabsStub,
          TabItem: tabItemStub,
          ElTag: true,
          ElButton: true,
        },
      },
    });

    const articleStore = useArticleStore();

    expect(router.replace).toHaveBeenCalledWith({
      path: '/user/99',
      query: {},
    });
    expect(articleStore.refreshFirstPageAction).not.toHaveBeenCalled();

    route.query = { tabName: '收藏' };
    await nextTick();

    expect(articleStore.initArticle).toHaveBeenCalledOnce();
  });

  it('pushes the follow sub-tab into the URL when the follower stat is clicked', async () => {
    route.query = {};

    const wrapper = mount(UserProfile, {
      props: {
        profile: {
          id: 99,
          name: 'other-user',
          sex: '男',
        },
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              root: {
                showLoginDialog: false,
                showProfileDialog: false,
                profileEditForm: {},
                windowInfo: { width: 1440, height: 900 },
              },
              user: {
                token: 'token',
                userInfo: { id: 42, name: 'current-user' },
                profile: { id: 99, name: 'other-user', sex: '男' },
                followInfoCache: {
                  99: {
                    data: {
                      following: [{ id: 1 }],
                      follower: [{ id: 2 }],
                    },
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
              article: {
                articles: {},
                recommends: [],
                article: {},
                tags: [],
                activeTagId: '综合',
                activeOrder: 'date',
              },
              comment: {
                userComments: [],
                userLikedCommentIdList: [],
                activeReplyId: null,
                activeEditId: null,
              },
              history: {},
            },
          }),
        ],
        stubs: {
          UserAvatar: true,
          UserProfileMenu: true,
          FollowButton: true,
          Icon: true,
          Tabs: tabsStub,
          TabItem: tabItemStub,
          ElTag: true,
          ElButton: true,
        },
      },
    });

    const userStore = useUserStore();

    await wrapper.findAll('.stat-item')[1]?.trigger('click');

    expect(userStore.getFollowAction).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({
      path: '/user/99',
      query: {
        tabName: '关注',
        subTabName: 'follower',
      },
    });
  });

  it('shows nickname as the primary identity and @account name as secondary on desktop and mobile', async () => {
    const wrapper = mountIdentityProfile({
      id: 99,
      name: 'ydp',
      nickname: '小杨',
      sex: '男',
    });

    expect(wrapper.get('[data-test="profile-display-name"]').text()).toBe('小杨');
    expect(wrapper.get('[data-test="profile-account-name"]').text()).toBe('@ydp');

    const rootStore = useRootStore();
    rootStore.windowInfo = { width: 390, height: 844 };
    await nextTick();

    expect(wrapper.get('[data-test="profile-display-name"]').text()).toBe('小杨');
    expect(wrapper.get('[data-test="profile-account-name"]').text()).toBe('@ydp');
  });

  it('falls back to account name as the primary identity when nickname is absent', () => {
    const wrapper = mountIdentityProfile({
      id: 99,
      name: 'ydp',
      nickname: null,
      sex: '男',
    });

    expect(wrapper.get('[data-test="profile-display-name"]').text()).toBe('ydp');
    expect(wrapper.get('[data-test="profile-account-name"]').text()).toBe('@ydp');
  });
});
