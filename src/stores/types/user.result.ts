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

export interface ICollect {
  id: number;
  name: string;
  count: number[];
  createAt?: string;
}

export interface IOnlineUser {
  /** 与后端 socket 广播一致，通常为字符串形式的用户 id */
  userId: string | number;
  userName: string;
  avatarUrl?: string;
  status?: string;
  connectedAt?: string;
}

export interface IFollowInfo {
  follower?: IUserInfo[];
  following?: IUserInfo[];
}

// 缓存条目的数据结构：包含实际数据和存入时间戳
export interface ICacheEntry<T> {
  data: T;
  timestamp: number; // 存入缓存的时间（毫秒）
}
