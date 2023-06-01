import { getNews } from '@/service/home/home.request';

const useHomeStore = defineStore('home', {
  state: () => ({
    news: [] as any[]
  }),
  actions: {
    updateUews(news: any[]) {
      news.forEach((item, index) => {
        // 除去没有封面的内容
        if (!item.urlToImage) news.splice(index, 1);
      });
      this.news = news;
      console.log('getNewsAction res', this.news);
    },
    // 异步请求action---------------------------------------------------
    async getNewsAction() {
      const res = await getNews();
      if (res.status === 'ok') {
        this.updateUews(res.articles);
      }
    }
  }
});

export default useHomeStore;
