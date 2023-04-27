import type { App } from 'vue';
import { createPinia } from 'pinia';
import router from '@/router';
import { LocalCache } from '@/utils';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import useCommentStore from '@/stores/comment';
import 'normalize.css';
import '@/assets/css/index.scss';
import 'element-plus/dist/index.css';

export default function init(app: App) {
  app.use(createPinia()).use(router).mount('#app');

  const userStore = useUserStore();
  const articleStore = useArticleStore();
  const commentStore = useCommentStore();
  router.beforeEach((to, from) => {
    console.log(`<路由守卫>检测到路由 ${from.path} --> ${to.path}`);
    to.matched.forEach((record) => (document.title = record.meta.title ? `${record.meta.title} - CoderX` : 'CoderX'));
    if (from.path !== to.path) {
      rootStore.initPage();
      userStore.initProfile();
    }
    if (to.path === '/article') {
      articleStore.initArticle();
      commentStore.initComment();
    }
  });

  const rootStore = useRootStore();
  LocalCache.getCache('token') && rootStore.checkAuthAction(); //每次刷新验证token
  rootStore.loadLoginAction();
}
