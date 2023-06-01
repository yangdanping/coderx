import { newsRequest } from '@/service';
import { NEWS_API_KEY } from '@/global/constants/keys';

export function getNews(pageSize = 10) {
  return newsRequest.get({
    // url: `/top-headlines?sources=techcrunch&sortBy=popularity&apiKey=${NEWS_API_KEY}&pageSize=6`
    url: `/top-headlines?country=us&category=technology&sortBy=popularity&apiKey=${NEWS_API_KEY}&pageSize=${pageSize}`
  });
}
