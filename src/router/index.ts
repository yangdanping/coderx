import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

/**
 * 路由配置
 *
 * meta 字段说明：
 * - title: 页面标题
 * - requiresAuth: 是否需要登录才能访问
 * - customNavBar: 是否使用自定义导航栏（设为 true 时，App.vue 中的全局 NavBar 不会显示）
 *
 * NavBar 显示规则（在 App.vue 中控制）：
 * - 编辑页面（edit）：不显示导航栏
 * - 详情页面（detail）：使用页面内自定义的 NavBar（带插槽），全局 NavBar 不显示
 * - 其他页面：显示全局 NavBar
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    // route level code-splitting
    // this generates a separate chunk (About.[hash]) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('@/views/home/Home.vue'),
  },
  {
    name: 'article',
    path: '/article',
    meta: { title: '文章' },
    component: () => import('@/views/article/Article.vue'),
  },
  {
    name: 'search',
    path: '/search',
    meta: { title: '搜索' },
    component: () => import('@/views/search/Search.vue'),
  },
  {
    name: 'flow',
    path: '/flow',
    meta: { title: 'Flow' },
    component: () => import('@/views/flow/Flow.vue'),
  },
  {
    name: 'detail',
    path: '/article/:articleId',
    props: true,
    meta: { title: '文章详情', customNavBar: true }, // 标记为使用自定义 NavBar
    component: () => import('@/views/detail/Detail.vue'),
  },
  {
    name: 'edit',
    path: '/edit',
    meta: { title: '写文章', requiresAuth: true }, // 需要登录才能访问
    component: () => import('@/views/edit/Edit.vue'),
  },
  {
    name: 'user',
    path: '/user/:userId',
    meta: { title: '个人空间' },
    component: () => import('@/views/user/User.vue'),
  },
  {
    name: 'oauth-callback',
    path: '/oauth/callback',
    meta: { title: 'OAuth 登录' },
    component: () => import('@/views/oauth/OAuthCallback.vue'),
  },
  {
    name: 'notfound',
    path: '/:pathMatch(.*)',
    component: () => import('@/views/NotFount.vue'),
  },
];
// hash的好处是不会因为服务器部署而找不到文件
const router = createRouter({
  // history: createWebHashHistory(),
  history: createWebHistory(),
  routes,
});

export default router;
