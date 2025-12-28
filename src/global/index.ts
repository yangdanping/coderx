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
import 'prismjs';
import 'prismjs/themes/prism-okaidia.css';

import type { App } from 'vue';
import useSocket from '@/service/socket';
import initDirective from './directive';

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

export default function init(app: App) {
  app.use(createPinia()).use(router).use(VueDOMPurifyHTML).use(VueQueryPlugin).mount('#app');
  initDirective(app); // 初始化指令
  // 使用vue-dompurify-html既可以保留样式和防止xss攻击
  const rootStore = useRootStore();
  const userStore = useUserStore();
  const articleStore = useArticleStore();
  const commentStore = useCommentStore();

  rootStore.loadLoginAction();
  rootStore.getWindowInfo();

  // 路由前置守卫 (使用async支持等待异步验证)
  router.beforeEach(async (to, from) => {
    console.log(`<路由前置守卫> 检测到路由 ${from.path} --> ${to.path}`);

    // 设置页面标题
    to.matched.forEach((record) => {
      const docTitle = record.meta.title;
      docTitle && (document.title = `${docTitle} - CoderX`);
    });

    const token = LocalCache.getCache('token');
    const requiresAuth = to.meta.requiresAuth; // 是否需要登录才能访问

    // 已登录用户访问受保护路由时,验证token有效性
    if (token && requiresAuth) {
      const needsVerification = !hasVerifiedOnce || isTokenExpiringSoon(token);
      if (needsVerification) {
        console.log('<路由前置守卫> 验证用户', hasVerifiedOnce ? '(切换路由,token即将过期)' : '(首次进入页面,验证token)');
        const isValid = await rootStore.checkAuthAction();
        hasVerifiedOnce = true;

        // 验证失败: 阻止导航 (弹出登录框已由响应拦截器处理)
        if (!isValid) {
          console.log('<路由前置守卫> token无效,拦截访问:', to.path);
          return false;
        }
      }
    }

    // 3. 其他路由逻辑
    if (from.path !== to.path) {
      // 不要使用 $reset()，它会重置 windowInfo 导致布局问题
      // 只重置分页和排序相关的字段
      rootStore.changePageNum(1);
      rootStore.changePageSize(10);
      rootStore.changePageOrder('date');
      rootStore.changeTag('');
    }
    if (to.path.includes('article')) {
      articleStore.initArticle();
      commentStore.$reset();
    }
  });

  // 路由后置守卫
  router.afterEach((to, from) => {
    window.scrollTo(0, 0);
    if (from.path.includes('/user')) {
      userStore.initProfile(); //再路由后置守卫中initProfile,防止白屏
    }
  });

  // LocalCache.getCache('token') && rootStore.checkAuthAction(); //每次刷新验证token
}
