import type { FlowAuthor, FlowFeedPage, FlowItem, FlowMedia } from './flow.types';

interface FlowMockItem {
  id: number;
  authorId: number;
  body: string;
  media: FlowMedia[];
  likes: number;
  comments: number;
  createdMinutesAgo: number;
}

const authors: FlowAuthor[] = [
  { id: 1, name: '林墨', username: 'linmo', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=LinMo' },
  { id: 2, name: '阿青', username: 'aqing', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=AQing' },
  { id: 3, name: '许一川', username: 'yichuan', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=YiChuan' },
  { id: 4, name: '小满', username: 'xiaoman', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=XiaoMan' },
  { id: 5, name: '周末写代码', username: 'weekenddev', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=WeekendDev' },
  { id: 6, name: '陈皮拿铁', username: 'lattechen', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=LatteChen' },
  { id: 7, name: '南桥', username: 'nanqiao', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=NanQiao' },
  { id: 8, name: '不晚', username: 'buwan', avatarUrl: 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=BuWan' },
];

function image(id: number, photoId: string, title: string): FlowMedia {
  const base = `https://images.unsplash.com/${photoId}`;
  return {
    id,
    url: `${base}?auto=format&fit=crop&w=1400&q=86`,
    thumbnailUrl: `${base}?auto=format&fit=crop&w=520&q=78`,
    title,
  };
}

const mockItems: FlowMockItem[] = [
  {
    id: 101,
    authorId: 6,
    body: '今天把水温从 92°C 降到 88°C，浅烘豆里那点尖锐的酸味终于柔和了。咖啡有时候很像调 CSS，差一点点就是另一种结果。',
    media: [image(1011, 'photo-1495474472287-4d71bcdd2085', '窗边的一杯手冲咖啡')],
    likes: 36,
    comments: 8,
    createdMinutesAgo: 18,
  },
  {
    id: 102,
    authorId: 1,
    body: '把个人页的无限滚动收尾了。真正费时间的不是“加载更多”，而是返回页面后怎么保留用户刚才看到的位置。',
    media: [],
    likes: 24,
    comments: 6,
    createdMinutesAgo: 42,
  },
  {
    id: 103,
    authorId: 4,
    body: '下班绕远走了两站路。雨停后的树叶很亮，耳机里刚好放到喜欢的那首歌，今天就算顺利结束。',
    media: [
      image(1031, 'photo-1500530855697-b586d89ba3ee', '雨后安静的林间小路'),
      image(1032, 'photo-1470770841072-f978cf4d019e', '傍晚湖边与远山'),
    ],
    likes: 58,
    comments: 12,
    createdMinutesAgo: 75,
  },
  {
    id: 104,
    authorId: 5,
    body: '给一个弹窗删掉了三层状态同步，代码少了七十多行。现在越来越觉得，最舒服的重构不是更聪明，而是让下一次修改更容易。',
    media: [image(1041, 'photo-1516321318423-f06f85e504b3', '桌面上的笔记本电脑与代码')],
    likes: 81,
    comments: 15,
    createdMinutesAgo: 130,
  },
  {
    id: 105,
    authorId: 2,
    body: '第一次做番茄炖牛腩，没有照着计时器走，闻到香味再关火。胡萝卜比牛肉先被吃完，有点意外。',
    media: [
      image(1051, 'photo-1498837167922-ddd27525d352', '刚做好的暖色家常料理'),
      image(1052, 'photo-1543353071-087092ec393a', '厨房桌上的食材'),
      image(1053, 'photo-1504674900247-0877df9cc836', '摆满食物的餐桌'),
    ],
    likes: 47,
    comments: 10,
    createdMinutesAgo: 205,
  },
  {
    id: 106,
    authorId: 7,
    body: '最近的阅读习惯：每天只读十页，不追求当天读完一章。进度看起来慢，但一个月后书签真的往前走了很多。',
    media: [image(1061, 'photo-1512820790803-83ca734da794', '木桌上的书与眼镜')],
    likes: 33,
    comments: 5,
    createdMinutesAgo: 310,
  },
  {
    id: 107,
    authorId: 3,
    body: '今天踩到一个很朴素的坑：请求取消不等于错误，UI 不应该弹“加载失败”。把取消、失败、空数据分开以后，状态终于顺眼了。',
    media: [],
    likes: 69,
    comments: 18,
    createdMinutesAgo: 420,
  },
  {
    id: 108,
    authorId: 8,
    body: '阳台上的薄荷又长出一截。剪了几片放进气泡水里，味道没有咖啡店那么精致，但很像夏天。',
    media: [image(1081, 'photo-1416879595882-3373a0480b5b', '阳光下生长的绿色植物')],
    likes: 41,
    comments: 7,
    createdMinutesAgo: 560,
  },
  {
    id: 109,
    authorId: 1,
    body: '把一个“看起来能复用”的组件拆回了两个普通组件。它们只是长得像，业务变化方向完全不同，强行统一反而让每个参数都变成谜语。',
    media: [],
    likes: 52,
    comments: 13,
    createdMinutesAgo: 720,
  },
  {
    id: 110,
    authorId: 6,
    body: '新买的杯子容量不大，但杯口很薄，喝拿铁时意外舒服。日常用品只要有一个细节做对，就会让人愿意一直用。',
    media: [
      image(1101, 'photo-1511081692775-05d0f180a065', '木桌上的拿铁与白色咖啡杯'),
      image(1102, 'photo-1509042239860-f550ce710b93', '咖啡店桌面上的咖啡'),
    ],
    likes: 29,
    comments: 4,
    createdMinutesAgo: 930,
  },
  {
    id: 111,
    authorId: 4,
    body: '地铁坐过站一次，索性从陌生出口走回家。发现一家只卖三种面包的小店，明天准备再去试试。',
    media: [image(1111, 'photo-1449824913935-59a10b8d2000', '傍晚城市街道与行人')],
    likes: 44,
    comments: 9,
    createdMinutesAgo: 1180,
  },
  {
    id: 112,
    authorId: 5,
    body: '今天没有写新功能，只补了测试和文档。以前会觉得没有产出，现在反而觉得这是在给明天省时间。',
    media: [image(1121, 'photo-1456324504439-367cee3b3c32', '写满笔记的纸张与电脑')],
    likes: 77,
    comments: 16,
    createdMinutesAgo: 1440,
  },
  {
    id: 113,
    authorId: 2,
    body: '晚饭后的水果切得很随意，端到窗边却刚好接住最后一点夕阳。拍完才发现，生活照好看的时候通常都没怎么准备。',
    media: [image(1131, 'photo-1610832958506-aa56368176cf', '窗边盘子里的新鲜水果')],
    likes: 62,
    comments: 11,
    createdMinutesAgo: 1820,
  },
  {
    id: 114,
    authorId: 3,
    body: '记录一个小技巧：做交互前先写清楚“哪里可以点，哪里不能点”。很多误触和冒泡问题，在这句话写完时就已经解决一半了。',
    media: [],
    likes: 91,
    comments: 21,
    createdMinutesAgo: 2260,
  },
  {
    id: 115,
    authorId: 7,
    body: '周末去看了一个很小的摄影展。最喜欢的不是宏大的风景，而是一张洗衣店凌晨还亮着灯的照片。',
    media: [
      image(1151, 'photo-1529139574466-a303027c1d8b', '安静展厅里的摄影作品'),
      image(1152, 'photo-1452780212940-6f5c0d14d848', '墙面上的相片与画框'),
    ],
    likes: 55,
    comments: 8,
    createdMinutesAgo: 2880,
  },
  {
    id: 116,
    authorId: 8,
    body: '猫把键盘当枕头睡了一下午，我只好拿纸写需求。结果意外地比在文档里敲字更容易想清楚。',
    media: [image(1161, 'photo-1518791841217-8f162f1e1131', '趴在桌边休息的猫')],
    likes: 103,
    comments: 25,
    createdMinutesAgo: 3600,
  },
  {
    id: 117,
    authorId: 1,
    body: '试着把手机通知关掉半天。没有突然变得高效，只是做每件事的时候更完整了一点。',
    media: [],
    likes: 66,
    comments: 14,
    createdMinutesAgo: 4320,
  },
  {
    id: 118,
    authorId: 6,
    body: '这周喝到最好的一杯不是昂贵豆子，而是同事午休时随手冲的。风味记不清了，只记得大家站在茶水间聊了很久。',
    media: [image(1181, 'photo-1442512595331-e89e73853f31', '咖啡师正在冲煮咖啡')],
    likes: 48,
    comments: 6,
    createdMinutesAgo: 5760,
  },
  {
    id: 119,
    authorId: 5,
    body: '一个页面做完后，我现在会特意用慢网和窄屏再走一次。正常情况只能证明它能跑，边界情况才会告诉你它是不是产品。',
    media: [image(1191, 'photo-1551650975-87deedd944c3', '手机与电脑上的应用界面')],
    likes: 84,
    comments: 19,
    createdMinutesAgo: 7200,
  },
  {
    id: 120,
    authorId: 4,
    body: '买花时老板多送了一枝，说这枝开得慢。放了四天才展开，颜色比旁边的都浅，等待还挺值得。',
    media: [
      image(1201, 'photo-1490750967868-88aa4486c946', '自然光下盛开的鲜花'),
      image(1202, 'photo-1487412912498-0447578fcca8', '桌上的花束与花瓶'),
    ],
    likes: 73,
    comments: 12,
    createdMinutesAgo: 8640,
  },
];

const mockNow = Date.now();
const authorMap = new Map(authors.map((author) => [author.id, author]));

const flowItems: FlowItem[] = mockItems.map((item) => ({
  id: item.id,
  author: authorMap.get(item.authorId)!,
  body: item.body,
  media: item.media,
  likes: item.likes,
  comments: item.comments,
  liked: false,
  createdAt: new Date(mockNow - item.createdMinutesAgo * 60_000).toISOString(),
}));

export async function getFlowFeed(page: number, pageSize = 10): Promise<FlowFeedPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;

  return {
    items: flowItems.slice(start, start + safePageSize),
    total: flowItems.length,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getFlowItemById(flowId: number): Promise<FlowItem | null> {
  return flowItems.find((item) => item.id === flowId) ?? null;
}
