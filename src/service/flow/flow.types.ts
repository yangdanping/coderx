export interface FlowAuthor {
  id: number;
  name: string;
  username: string;
  avatarUrl: string;
}

export interface FlowMedia {
  id: number;
  url: string;
  thumbnailUrl: string;
  title: string;
}

export interface FlowItem {
  id: number;
  author: FlowAuthor;
  body: string;
  media: FlowMedia[];
  likes: number;
  comments: number;
  liked: boolean;
  createdAt: string;
}

export interface FlowFeedPage {
  items: FlowItem[];
  total: number;
  page: number;
  pageSize: number;
}
