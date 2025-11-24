import { getNews, getHotUsers } from '@/service/home/home.request';
import { LocalCache } from '@/utils';

const useHomeStore = defineStore('home', {
  state: () => ({
    news: [] as any[],
    hotUsers: [] as any[],
  }),
  actions: {
    // 异步请求action---------------------------------------------------
    async getNewsAction() {
      let articles: any[] = [];
      const cachedNews = LocalCache.getCache('news');

      if (!cachedNews) {
        const res = await getNews();
        if (res?.articles.length) {
          console.log('重新获取新闻', res.articles);
          LocalCache.setCache('news', res.articles);
          articles = res.articles;
        }
      } else {
        console.log('拿到已有新闻', cachedNews);
        articles = cachedNews;
      }

      // 统一处理新闻列表：过滤掉没有封面的内容
      this.news = articles.filter((item) => item.urlToImage);
    },
    async getHotUsersAction() {
      const res = await getHotUsers();
      if (res.code === 0) {
        this.hotUsers = res.data;
      }
      console.log('首页获得热门作者', this.hotUsers);
    },
  },
});

export default useHomeStore;
