import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { notificationStore, routerResolve, openMock } = vi.hoisted(() => ({
  notificationStore: {
    notificationList: [] as any[],
    unreadCount: 1,
    refreshAction: vi.fn(),
    markAllReadAction: vi.fn(),
    markReadAction: vi.fn(),
  },
  routerResolve: vi.fn(() => ({ href: '/article/30' })),
  openMock: vi.fn(),
}));

vi.mock('@/stores/notification.store', () => ({
  default: () => notificationStore,
}));

vi.mock('@/components/avatar/Avatar.vue', () => ({
  default: {
    name: 'Avatar',
    props: ['info', 'size', 'disabled'],
    template: '<span class="avatar-stub">{{ info?.name }}</span>',
  },
}));

vi.mock('@/components/icon/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['type', 'isActive', 'size', 'showLabel', 'responsive'],
    template: '<span class="icon-stub" :data-type="type"></span>',
  },
}));

vi.mock('@/utils/dateFormat', () => ({
  default: () => '7 小时前',
}));

vi.mock('vue-router', async () => ({
  useRouter: () => ({
    resolve: routerResolve,
  }),
}));

import NavBarNotification from '../NavBarNotification.vue';

describe('NavBarNotification', () => {
  beforeEach(() => {
    notificationStore.notificationList = [
      {
        id: 1,
        recipientId: 10,
        actorId: 20,
        actor: {
          id: 20,
          name: 'daniel',
          avatarUrl: 'https://api.example/user/20/avatar',
        },
        type: 'article_like',
        targetType: 'article',
        targetId: 30,
        articleId: 30,
        article: {
          id: 30,
          title: '一二三四五六七八九十一二三四五六七八九十甲乙',
        },
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];
    notificationStore.refreshAction.mockReset();
    notificationStore.markAllReadAction.mockReset();
    notificationStore.markReadAction.mockReset();
    routerResolve.mockClear();
    openMock.mockClear();
    vi.stubGlobal('open', openMock);
  });

  it('renders article-like notifications with actor identity, avatar badge, and truncated article title', async () => {
    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');

    expect(wrapper.text()).toContain('daniel 点赞了你的文章');
    expect(wrapper.text()).toContain('一二三四五六七八九十一二三四五六七八九十...');
    expect(wrapper.text()).not.toContain('用户 #20');
    expect(wrapper.text()).not.toContain('文章 #30');
    expect(wrapper.find('.notification-item__avatar').exists()).toBe(true);
    expect(wrapper.find('.notification-item__like-badge').exists()).toBe(true);
  });

  it('renders article-comment notifications with comment icon, excerpt, and comment query navigation', async () => {
    notificationStore.notificationList = [
      {
        id: 2,
        recipientId: 10,
        actorId: 21,
        actor: {
          id: 21,
          name: 'ada',
          avatarUrl: 'https://api.example/user/21/avatar',
        },
        type: 'article_comment',
        targetType: 'article',
        targetId: 31,
        articleId: 31,
        commentId: 41,
        article: {
          id: 31,
          title: '评论通知文章',
        },
        metadata: {
          commentExcerpt: '这是一条很好的评论',
        },
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];
    routerResolve.mockReturnValue({ href: '/article/31?commentId=41' });

    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');

    expect(wrapper.text()).toContain('ada 评论了你的文章');
    expect(wrapper.text()).toContain('这是一条很好的评论');
    expect(wrapper.find('.icon-stub').attributes('data-type')).toBe('comment');

    await wrapper.get('.notification-item').trigger('click');

    expect(notificationStore.markReadAction).toHaveBeenCalledWith(2);
    expect(routerResolve).toHaveBeenCalledWith({
      name: 'detail',
      params: { articleId: 31 },
      query: { commentId: '41' },
    });
    expect(openMock).toHaveBeenCalledWith('/article/31?commentId=41', '_blank');
  });
});
