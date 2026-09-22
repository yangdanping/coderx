import { createTestingPinia } from '@pinia/testing';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useUserStore from '@/stores/user.store';
import UserCollect from '../UserCollect.vue';

const api = vi.hoisted(() => ({
  getList: vi.fn(),
  getCollect: vi.fn(),
  getLiked: vi.fn(),
  removeCollectArticle: vi.fn(),
}));

vi.mock('@/service/article/article.request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/article/article.request')>()),
  getList: api.getList,
}));
vi.mock('@/service/user/user.request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/user/user.request')>()),
  getLiked: api.getLiked,
}));
vi.mock('@/service/collect/collect.request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/collect/collect.request')>()),
  getCollect: api.getCollect,
  removeCollectArticle: api.removeCollectArticle,
}));

const ids = Array.from({ length: 11 }, (_, index) => index + 1);
const makeCollects = (count: number[] | null = ids) => [{ id: 7, name: '技术笔记', count, createAt: '2026-09-01' }];
const page = (articleIds: number[], total = 11) => ({
  code: 0,
  data: { result: articleIds.map((id) => ({ id, title: `文章 ${id}` })), total },
});

const wrappers: VueWrapper[] = [];
const clients: QueryClient[] = [];

async function mountCollect(ownerId = 2, count: number[] | null = ids) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/user/:userId', component: { template: '<div />' } }],
  });
  await router.push(`/user/${ownerId}?tabName=收藏`);
  await router.isReady();
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      root: { authStatus: 'authenticated' },
      user: { token: 'test-token', userInfo: { id: 1 }, profile: { id: ownerId, sex: '男' }, collects: makeCollects(count) },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  clients.push(queryClient);
  const wrapper = mount(UserCollect, {
    attachTo: document.body,
    global: {
      plugins: [router, pinia, [VueQueryPlugin, { queryClient }]],
      directives: { dateformat: () => {} },
      stubs: {
        ListItem: { props: ['item'], template: '<div class="article-item">{{ item.title }}<slot name="checkbox" /><slot name="action" /></div>' },
        ArticleAction: true,
        ElButton: { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
        ElTooltip: { template: '<div><slot /></div>' },
        ElSkeleton: { template: '<div class="skeleton" />' },
        ElPopconfirm: { emits: ['confirm'], template: '<div><slot name="reference" /><button class="confirm-remove" @click="$emit(\'confirm\')">确认移除</button></div>' },
      },
    },
  });
  wrappers.push(wrapper);
  return { wrapper, router, userStore: useUserStore(pinia) };
}

async function openCollect(wrapper: VueWrapper) {
  await wrapper.get('[aria-label="查看收藏夹技术笔记"]').trigger('click');
  await flushPromises();
}

describe('UserCollect navigation and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getLiked.mockResolvedValue({ code: 0, data: { articleLiked: [] } });
    api.getCollect.mockResolvedValue({ code: 0, data: makeCollects() });
    api.getList.mockImplementation(({ pageNum }: { pageNum: number }) => Promise.resolve(page(pageNum === 1 ? ids.slice(0, 10) : ids.slice(10))));
  });

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    clients.splice(0).forEach((client) => client.clear());
  });

  it('returns to the viewed user’s collections instead of the signed-in user’s', async () => {
    const { wrapper } = await mountCollect();
    await openCollect(wrapper);
    await wrapper.get('[aria-label="返回收藏夹列表"]').trigger('click');
    await flushPromises();
    expect(api.getCollect).toHaveBeenLastCalledWith(2);
    expect(wrapper.find('[aria-label="查看收藏夹技术笔记"]').exists()).toBe(true);
  });

  it('shows the total and loads articles beyond the first ten', async () => {
    const { wrapper } = await mountCollect();
    await openCollect(wrapper);
    expect(wrapper.get('h2').text()).toContain('(11)');
    expect(wrapper.findAll('.article-item')).toHaveLength(10);
    await wrapper.get('[aria-label="加载更多收藏文章"]').trigger('click');
    await flushPromises();
    expect(api.getList).toHaveBeenLastCalledWith(expect.objectContaining({ pageNum: 2, idList: ids }), undefined, expect.any(AbortSignal));
    expect(wrapper.findAll('.article-item')).toHaveLength(11);
    expect(wrapper.text()).toContain('没有更多了');
  });

  it('keeps a navigable empty detail without requesting the unfiltered article list', async () => {
    const { wrapper } = await mountCollect(2, null);
    await openCollect(wrapper);
    expect(wrapper.text()).toContain('该收藏夹还没有文章');
    expect(wrapper.find('[aria-label="返回收藏夹列表"]').exists()).toBe(true);
    expect(api.getList).not.toHaveBeenCalled();
  });

  it('shows a retry action after the initial article request fails', async () => {
    api.getList.mockResolvedValueOnce({ code: 1, msg: 'network unavailable' });
    const { wrapper } = await mountCollect();
    await openCollect(wrapper);
    await vi.waitFor(() => expect(wrapper.text()).toContain('加载失败'));
    await wrapper.get('[aria-label="重试加载收藏文章"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.article-item')).toHaveLength(10);
  });

  it('retains loaded articles when the next page fails and retries that page', async () => {
    const { wrapper } = await mountCollect();
    await openCollect(wrapper);
    api.getList.mockRejectedValueOnce(new Error('next page unavailable'));
    await wrapper.get('[aria-label="加载更多收藏文章"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.article-item')).toHaveLength(10);
    await wrapper.get('[aria-label="重试加载更多收藏文章"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.article-item')).toHaveLength(11);
  });

  it('does not expose batch management while viewing another user', async () => {
    const { wrapper } = await mountCollect();
    await openCollect(wrapper);
    expect(wrapper.find('[aria-label="进入批量操作"]').exists()).toBe(false);
  });

  it('leaves the old collection detail when the profile route changes', async () => {
    const { wrapper, router } = await mountCollect();
    await openCollect(wrapper);
    await router.push('/user/3?tabName=收藏');
    await flushPromises();
    expect(wrapper.find('[aria-label="返回收藏夹列表"]').exists()).toBe(false);
    expect(wrapper.findAll('.article-item')).toHaveLength(0);
  });

  it('retains selection on a failed removal, then handles the last removal without fetching all articles', async () => {
    api.getList.mockResolvedValue(page([1], 1));
    api.removeCollectArticle.mockResolvedValueOnce({ code: 1, msg: 'failed' }).mockResolvedValueOnce({ code: 0, data: { collectedArticle: null } });
    const { wrapper, userStore } = await mountCollect(1, [1]);
    await openCollect(wrapper);
    await wrapper.get('[aria-label="进入批量操作"]').trigger('click');
    await wrapper.get('[aria-label="选择文章文章 1"]').setValue(true);
    await wrapper.get('.confirm-remove').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('已选择1');
    expect(wrapper.findAll('.article-item')).toHaveLength(1);
    await wrapper.get('.confirm-remove').trigger('click');
    await flushPromises();
    expect(api.removeCollectArticle).toHaveBeenLastCalledWith(7, [1]);
    expect(userStore.collects[0]?.count).toEqual([]);
    expect(wrapper.text()).toContain('该收藏夹还没有文章');
    expect(api.getList).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[aria-label="返回收藏夹列表"]').exists()).toBe(true);
  });

  it('reloads the remaining ids and total after a successful partial removal', async () => {
    api.removeCollectArticle.mockResolvedValue({ code: 0, data: { collectedArticle: ids.slice(1) } });
    const { wrapper, userStore } = await mountCollect(1);
    await openCollect(wrapper);
    await wrapper.get('[aria-label="进入批量操作"]').trigger('click');
    await wrapper.get('[aria-label="选择文章文章 1"]').setValue(true);
    api.getList.mockResolvedValue(page(ids.slice(1), 10));
    await wrapper.get('.confirm-remove').trigger('click');
    await flushPromises();
    expect(userStore.collects[0]?.count).toEqual(ids.slice(1));
    expect(api.getList).toHaveBeenLastCalledWith(expect.objectContaining({ pageNum: 1, idList: ids.slice(1) }), undefined, expect.any(AbortSignal));
    expect(wrapper.get('h2').text()).toContain('(10)');
    expect(wrapper.find('[aria-label="退出批量操作"]').exists()).toBe(false);
  });
});
