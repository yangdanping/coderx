import { createPinia } from 'pinia';
import router from '@/router';
import { LocalCache } from '@/utils';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import useCommentStore from '@/stores/comment';
import VueDOMPurifyHTML from 'vue-dompurify-html';
import 'normalize.css';
import '@/assets/css/index.scss';
import 'element-plus/dist/index.css';
import 'prismjs';
import 'prismjs/themes/prism-okaidia.css';

import type { App } from 'vue';
import useSocket from '@/service/socket';
export default function init(app: App) {
  app.use(createPinia()).use(router).use(VueDOMPurifyHTML).mount('#app');
  // 使用vue-dompurify-html既可以保留样式和防止xss攻击

  const rootStore = useRootStore();
  const userStore = useUserStore();
  const articleStore = useArticleStore();
  const commentStore = useCommentStore();

  rootStore.loadLoginAction();
  rootStore.changeWindowInfo();
  const socket = useSocket();
  // 路由前置守卫
  router.beforeEach((to, from) => {
    console.log(`<路由前置守卫>检测到路由 ${from.path} --> ${to.path}`);
    to.matched.forEach((record) => (document.title = record.meta.title ? `${record.meta.title} - CoderX` : 'CoderX'));
    if (from.path !== to.path) {
      rootStore.$reset();
    }
    if (to.path.includes('article')) {
      console.log('initArticle');
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

  LocalCache.getCache('token') && rootStore.checkAuthAction(); //每次刷新验证token
}
