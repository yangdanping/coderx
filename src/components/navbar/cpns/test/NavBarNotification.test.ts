import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { notificationStore, routerResolve, routerPush, openMock } = vi.hoisted(() => ({
  notificationStore: {
    notificationList: [] as any[],
    unreadCount: 1,
    refreshAction: vi.fn(),
    markAllReadAction: vi.fn(),
    markReadAction: vi.fn(),
  },
  routerResolve: vi.fn(() => ({ href: '/article/30' })),
  routerPush: vi.fn(),
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
    push: routerPush,
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
    routerPush.mockClear();
    openMock.mockClear();
    openMock.mockReturnValue({});
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
    expect(routerPush).toHaveBeenCalledWith({
      name: 'detail',
      params: { articleId: 31 },
      query: { commentId: '41' },
    });
    expect(openMock).not.toHaveBeenCalled();
  });

  it('renders comment-reply notifications with reply copy, excerpt, comment icon, and comment query navigation', async () => {
    notificationStore.notificationList = [
      {
        id: 3,
        recipientId: 10,
        actorId: 22,
        actor: {
          id: 22,
          name: 'grace',
          avatarUrl: 'https://api.example/user/22/avatar',
        },
        type: 'comment_reply',
        targetType: 'article',
        targetId: 32,
        articleId: 32,
        commentId: 42,
        article: {
          id: 32,
          title: '回复通知文章',
        },
        metadata: {
          commentExcerpt: '回复里有新的想法',
          replyId: 104,
        },
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];
    routerResolve.mockReturnValue({ href: '/article/32?commentId=42&replyId=104' });

    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');

    expect(wrapper.text()).toContain('grace 回复了你的评论');
    expect(wrapper.text()).toContain('回复里有新的想法');
    expect(wrapper.find('.icon-stub').attributes('data-type')).toBe('comment');

    await wrapper.get('.notification-item').trigger('click');

    expect(notificationStore.markReadAction).toHaveBeenCalledWith(3);
    expect(routerPush).toHaveBeenCalledWith({
      name: 'detail',
      params: { articleId: 32 },
      query: { commentId: '42', replyId: '104' },
    });
    expect(openMock).not.toHaveBeenCalled();
  });

  it('renders article-author reply notifications with article reply copy', async () => {
    notificationStore.notificationList = [
      {
        id: 6,
        recipientId: 10,
        actorId: 22,
        actor: {
          id: 22,
          name: 'grace',
          avatarUrl: 'https://api.example/user/22/avatar',
        },
        type: 'comment_reply',
        targetType: 'article',
        targetId: 32,
        articleId: 32,
        commentId: 42,
        article: {
          id: 32,
          title: '回复通知文章',
        },
        metadata: {
          commentExcerpt: '回复里有新的想法',
          replyId: 104,
          recipientRole: 'article_author',
        },
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];

    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');

    expect(wrapper.text()).toContain('grace 在你的文章下发表了回复');
    expect(wrapper.text()).not.toContain('grace 回复了你的评论');
  });

  it('renders follow notifications and navigates to the actor profile', async () => {
    notificationStore.notificationList = [
      {
        id: 7,
        recipientId: 10,
        actorId: 25,
        actor: {
          id: 25,
          name: 'nina',
          avatarUrl: 'https://api.example/user/25/avatar',
        },
        type: 'follow',
        targetType: 'user',
        targetId: 10,
        articleId: null,
        article: null,
        commentId: null,
        comment: null,
        metadata: {},
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];

    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');

    expect(wrapper.text()).toContain('nina 关注了你');
    expect(wrapper.text()).toContain('查看 Ta 的主页');
    expect(wrapper.find('.icon-stub').attributes('data-type')).toBe('follow');

    await wrapper.get('.notification-item').trigger('click');

    expect(notificationStore.markReadAction).toHaveBeenCalledWith(7);
    expect(routerPush).toHaveBeenCalledWith({
      name: 'user',
      params: { userId: 25 },
    });
    expect(openMock).not.toHaveBeenCalled();
  });

  it('navigates to the notification target before waiting for mark-as-read to finish', async () => {
    let resolveMarkRead: () => void = () => {};
    notificationStore.markReadAction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMarkRead = resolve;
        }),
    );
    notificationStore.notificationList = [
      {
        id: 4,
        recipientId: 10,
        actorId: 23,
        actor: {
          id: 23,
          name: 'lin',
          avatarUrl: null,
        },
        type: 'comment_reply',
        targetType: 'article',
        targetId: 33,
        articleId: 33,
        commentId: 43,
        article: {
          id: 33,
          title: '异步标记已读文章',
        },
        metadata: {
          commentExcerpt: '延迟标记已读也应该能打开',
        },
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];
    routerResolve.mockReturnValue({ href: '/article/33?commentId=43' });

    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');
    await wrapper.get('.notification-item').trigger('click');

    try {
      expect(routerPush).toHaveBeenCalledWith({
        name: 'detail',
        params: { articleId: 33 },
        query: { commentId: '43' },
      });
    } finally {
      resolveMarkRead();
      await Promise.resolve();
    }
  });

  it('uses in-app navigation so popup blockers cannot interrupt notification clicks', async () => {
    notificationStore.notificationList = [
      {
        id: 5,
        recipientId: 10,
        actorId: 24,
        actor: {
          id: 24,
          name: 'mira',
          avatarUrl: null,
        },
        type: 'comment_reply',
        targetType: 'article',
        targetId: 34,
        articleId: 34,
        commentId: 44,
        article: {
          id: 34,
          title: '弹窗拦截文章',
        },
        metadata: {
          commentExcerpt: '新标签打不开时也要跳转',
        },
        readAt: null,
        createdAt: '2026-05-14T08:00:00.000Z',
        lastOccurredAt: '2026-05-14T08:00:00.000Z',
      },
    ];
    routerResolve.mockReturnValue({ href: '/article/34?commentId=44' });

    const wrapper = mount(NavBarNotification);

    await wrapper.get('.navbar-action-panel__trigger').trigger('click');
    await wrapper.get('.notification-item').trigger('click');

    expect(openMock).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'detail',
      params: { articleId: 34 },
      query: { commentId: '44' },
    });
  });
});
