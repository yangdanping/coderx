import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
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
import useUserStore from '@/stores/user.store';
import UserProfile from '../UserProfile.vue';

describe('UserProfile', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    route.params.userId = '99';
    route.path = '/user/99';
    route.query = { tabName: '最近浏览' };
  });

  it('normalizes unauthorized deep links and falls back to the article tab data fetch', () => {
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
                onlineUsers: [],
              },
              article: {
                articles: {},
                recommends: [],
                article: {},
                userLikedArticleIdList: [],
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
    expect(articleStore.refreshFirstPageAction).toHaveBeenCalledWith({ userId: '99' });
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
                onlineUsers: [],
              },
              article: {
                articles: {},
                recommends: [],
                article: {},
                userLikedArticleIdList: [],
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
});
