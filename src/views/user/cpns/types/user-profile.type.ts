export type ProfileTabName = '文章' | '评论' | '收藏' | '关注' | '最近浏览';

export type FollowSubTabName = 'following' | 'follower';

export type ProfileInfoItem = {
  label: string;
  value: string | number;
  icon: 'coin' | 'suitcase' | 'coordinate' | 'takeaway-box';
};

export type ProfileQuery = {
  tabName?: ProfileTabName;
  subTabName?: FollowSubTabName;
};
