import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const route = reactive({
  params: {
    articleId: '1',
  },
  query: {},
  path: '/article/1',
});

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => route,
  };
});

import useArticleStore from '@/stores/article.store';
import Detail from '../Detail.vue';

describe('Detail', () => {
  it('reloads article details when the route articleId changes', async () => {
    route.params.articleId = '1';
    route.path = '/article/1';

    const wrapper = mount(Detail, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: {
                token: '',
                userInfo: { id: 7, name: 'tester' },
                profile: {},
                followInfoCache: {},
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
            },
          }),
        ],
        stubs: {
          NavBar: { template: '<div><slot /></div>' },
          DetailTools: true,
          DetailContent: true,
          Comment: true,
          AiAssistant: true,
        },
      },
    });

    const articleStore = useArticleStore();

    expect(articleStore.getDetailAction).toHaveBeenCalledWith('1');

    route.params.articleId = '2';
    route.path = '/article/2';
    await nextTick();

    expect(articleStore.getDetailAction).toHaveBeenLastCalledWith('2');

    wrapper.unmount();
  });
});
