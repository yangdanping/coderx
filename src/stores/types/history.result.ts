export interface IHistoryItem {
  id: number;
  articleId: number;
  title: string;
  content: string;
  author: {
    id: number;
    name: string;
    avatarUrl: string;
  };
  views: number;
  likes: number;
  commentCount: number;
  cover: string;
  articleUrl: string;
  createAt: string;
  updateAt: string;
}

export interface IHistoryState {
  historyList: IHistoryItem[];
  total: number;
  pageNum: number;
  pageSize: number;
  loading: boolean;
}
