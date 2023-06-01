import { newsRequest } from '@/service';
import { NEWS_API_KEY } from '@/global/constants/keys';

export function getNews(pageSize = 10) {
  return newsRequest.get({
    // url: `/top-headlines?country=us&category=technology&sortBy=popularity&apiKey=${NEWS_API_KEY}&pageSize=${pageSize}`
    url: `/search?sortby=relevance&apikey=${NEWS_API_KEY}&q=programmer&country=us&max=${pageSize}`
  });
}
