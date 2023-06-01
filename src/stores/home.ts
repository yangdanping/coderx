import { getNews } from '@/service/home/home.request';
import { LocalCache } from '@/utils';

const useHomeStore = defineStore('home', {
  state: () => ({
    news: [] as any[]
  }),
  actions: {
    updateNews(news: any[]) {
      news.forEach((item, index) => {
        // 除去没有封面的内容
        if (!item.image) news.splice(index, 1);
      });
      this.news = news;
      console.log('getNewsAction res', this.news);
    },
    // 异步请求action---------------------------------------------------
    async getNewsAction() {
      const news = LocalCache.getCache('news');
      if (!news) {
        const res = await getNews();
        console.log('重新获取新闻', res);
        if (res.articles.length) {
          LocalCache.setCache('news', res.articles);
          this.updateNews(res.articles);
        }
      } else {
        console.log('拿到已有新闻', news);
        this.updateNews(news);
      }
    }
  }
});

export default useHomeStore;
