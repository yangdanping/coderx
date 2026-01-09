export interface IUserInfo {
  id?: number;
  name?: string;
  avatarUrl?: string;
  age?: number;
  sex?: string;
  email?: string;
  career?: string;
  address?: string;
  articleCount?: number;
  commentCount?: number;
  status?: number;
  onlineStatus?: number;
}
export interface IFollowInfo {
  follower?: any[];
  following?: any[];
}

// 缓存条目的数据结构：包含实际数据和存入时间戳
export interface ICacheEntry<T> {
  data: T;
  timestamp: number; // 存入缓存的时间（毫秒）
}
