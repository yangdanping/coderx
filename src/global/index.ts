import { createPinia } from 'pinia';
import router from '@/router';
import { LocalCache } from '@/utils';
import { VueQueryPlugin } from '@tanstack/vue-query';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import VueDOMPurifyHTML from 'vue-dompurify-html';
import 'normalize.css';
import '@/assets/css/index.scss';
import 'element-plus/dist/index.css';
// Element Plus 暗黑模式 CSS 变量
import 'element-plus/theme-chalk/dark/css-vars.css';
// highlight.js 主题样式（用于代码块语法高亮）
import 'highlight.js/styles/atom-one-dark.css';

import { initThemeOnLoad } from '@/composables/useTheme';

import type { App } from 'vue';
import initDirective from './directive';
import type { RouteLocationNormalized } from 'vue-router';
const DEFAULT_DOCUMENT_TITLE = 'CoderX';
type GuardRouteLike = Pick<RouteLocationNormalized, 'path' | 'meta' | 'matched'>;
type GuardRootStoreLike = Pick<ReturnType<typeof useRootStore>, 'showLoginDialog' | 'toggleLoginDialog' | 'checkAuthAction'>;
type GuardArticleStoreLike = Pick<ReturnType<typeof useArticleStore>, 'initArticle'>;
type GuardCommentStoreLike = Pick<ReturnType<typeof useCommentStore>, '$reset'>;

/**
 * 检查JWT token是否即将过期
 * @param token - JWT token字符串
 * @param threshold - 过期阈值(秒),默认5分钟
 * @returns 是否即将过期或已过期
 */
function isTokenExpiringSoon(token: string, threshold = 5 * 60): boolean {
  try {
    // JWT结构: Header.Payload.Signature, 取中间的Payload部分
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true; // token格式异常
    // atob(): 解码Base64字符串 (ASCII to Binary的缩写)
    const payload = JSON.parse(atob(payloadBase64));
    // exp是Unix时间戳(秒), 需要*1000转为毫秒与Date.now()比较
    return payload.exp * 1000 - Date.now() < threshold * 1000;
  } catch {
    return true; // 解析失败视为需要验证
  }
}

// 标记是否已完成首次验证(页面刷新/首次加载时需要验证一次)
let hasVerifiedOnce = false;

function setDocumentTitle(to: RouteLocationNormalized) {
  const matchedTitle = [...to.matched].reverse().find((record) => typeof record.meta.title === 'string')?.meta.title;
  document.title = matchedTitle ? `${matchedTitle} - ${DEFAULT_DOCUMENT_TITLE}` : DEFAULT_DOCUMENT_TITLE;
}

function ensureLoginDialogOpen(rootStore: ReturnType<typeof useRootStore>) {
  !rootStore.showLoginDialog && rootStore.toggleLoginDialog();
}

export async function handleBeforeEachNavigation({
  to,
  from,
  rootStore,
  articleStore,
  commentStore,
  token,
  hasVerifiedOnce,
  setDocumentTitle: applyDocumentTitle = setDocumentTitle,
  ensureLoginDialog: openLoginDialog = ensureLoginDialogOpen,
  isTokenExpiringSoon: checkTokenExpiringSoon = isTokenExpiringSoon,
}: {
  to: GuardRouteLike;
  from: GuardRouteLike;
  rootStore: GuardRootStoreLike;
  articleStore: GuardArticleStoreLike;
  commentStore: GuardCommentStoreLike;
  token: string | undefined;
  hasVerifiedOnce: boolean;
  setDocumentTitle?: (to: GuardRouteLike) => void;
  ensureLoginDialog?: (rootStore: GuardRootStoreLike) => void;
  isTokenExpiringSoon?: (token: string, threshold?: number) => boolean;
}) {
  applyDocumentTitle(to);

  const requiresAuth = Boolean(to.meta.requiresAuth);

  // 未登录用户访问受保护路由：保持当前页面，并弹出登录框
  if (!token && requiresAuth) {
    console.log('[路由前置守卫 beforeEach] 未登录用户访问受保护路由:', to.path);
    openLoginDialog(rootStore);
    // 首次直达受保护路由时没有可回退页面，重定向到首页
    if (from.matched.length === 0) {
      return {
        navigationResult: { name: 'home' as const },
        hasVerifiedOnce,
      };
    }
    return {
      navigationResult: false as const,
      hasVerifiedOnce,
    };
  }

  let nextHasVerifiedOnce = hasVerifiedOnce;

  // 已登录用户访问受保护路由时,验证token有效性
  if (token && requiresAuth) {
    const needsVerification = !hasVerifiedOnce || checkTokenExpiringSoon(token);
    if (needsVerification) {
      console.log('[路由前置守卫 beforeEach] 验证用户', hasVerifiedOnce ? '(切换路由,token即将过期)' : '(首次进入页面,验证token)');
      const isValid = await rootStore.checkAuthAction();
      nextHasVerifiedOnce = true;

      // 验证失败: 阻止导航 (弹出登录框已由响应拦截器处理)
      if (!isValid) {
        console.log('[路由前置守卫 beforeEach] token无效,拦截访问:', to.path);
        return {
          navigationResult: false as const,
          hasVerifiedOnce: nextHasVerifiedOnce,
        };
      }
    }
  }

  if (to.path.includes('article')) {
    articleStore.initArticle();
    commentStore.$reset();
  }

  return {
    navigationResult: undefined,
    hasVerifiedOnce: nextHasVerifiedOnce,
  };
}

export default function init(app: App) {
  // 在应用挂载前初始化主题，避免闪烁
  initThemeOnLoad();

  const pinia = createPinia();
  app.use(pinia);

  // SPA 场景下，Pinia 安装后即可直接获取 store
  const rootStore = useRootStore();

  rootStore.loadLoginAction();
  rootStore.getWindowInfo();

  // 路由前置守卫 (使用async支持等待异步验证)
  router.beforeEach(async (to, from) => {
    const rootStore = useRootStore();
    const articleStore = useArticleStore();
    const commentStore = useCommentStore();

    console.log(`[路由前置守卫 beforeEach] 检测到路由 ${from.path} --> ${to.path}`);
    const result = await handleBeforeEachNavigation({
      to,
      from,
      rootStore,
      articleStore,
      commentStore,
      token: LocalCache.getCache('token'),
      hasVerifiedOnce,
    });
    hasVerifiedOnce = result.hasVerifiedOnce;
    return result.navigationResult;
  });

  // 路由后置守卫
  router.afterEach((to, from) => {
    const userStore = useUserStore();

    window.scrollTo(0, 0);

    // 只在真正离开用户页时清空 profile。
    // 同一用户页内切换 query（例如个人页 tab / 关注子 tab）也会触发 afterEach，
    // 如果这里按 from.path 粗暴重置，会把当前页资料和关注缓存的读取锚点一起清掉。
    if (from.name === 'user' && to.name !== 'user') {
      userStore.initProfile();
    }
  });

  app.use(router).use(VueDOMPurifyHTML).use(VueQueryPlugin);
  initDirective(app); // 初始化指令
  app.mount('#app');
}
