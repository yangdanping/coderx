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
}
export interface IFollowInfo {
  follower?: any[];
  following?: any[];
}
