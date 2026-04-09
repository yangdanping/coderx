import type { FlowAuthor, FlowFeedPage, FlowItem, FlowMedia } from './flow.types';

const BASE = 'https://jsonplaceholder.typicode.com';

interface JsonPlaceholderUser {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface JsonPlaceholderPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

interface JsonPlaceholderPhoto {
  albumId: number;
  id: number;
  title: string;
  url: string;
  thumbnailUrl: string;
}

let cachedUsers: JsonPlaceholderUser[] | null = null;
let cachedPhotos: JsonPlaceholderPhoto[] | null = null;

async function fetchUsers(): Promise<JsonPlaceholderUser[]> {
  if (cachedUsers) return cachedUsers;
  const res = await fetch(`${BASE}/users`);
  cachedUsers = await res.json();
  return cachedUsers!;
}

async function fetchPhotos(): Promise<JsonPlaceholderPhoto[]> {
  if (cachedPhotos) return cachedPhotos;
  const res = await fetch(`${BASE}/photos?_limit=100`);
  cachedPhotos = await res.json();
  return cachedPhotos!;
}

function mapAuthor(user: JsonPlaceholderUser): FlowAuthor {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`,
  };
}

function pickMediaForPost(postId: number, photos: JsonPlaceholderPhoto[]): FlowMedia[] {
  const seed = ((postId * 7 + 13) % 6) + 1;
  const count = seed;
  const startIdx = (postId * 3) % Math.max(photos.length - count, 1);
  return photos.slice(startIdx, startIdx + count).map((p) => {
    const picsumId = ((p.id * 7 + 31) % 1000) + 10;
    return {
      id: p.id,
      url: `https://picsum.photos/id/${picsumId}/800/600`,
      thumbnailUrl: `https://picsum.photos/id/${picsumId}/300/225`,
      title: p.title,
    };
  });
}

function generateCreatedAt(postId: number): string {
  const base = new Date('2026-04-01T08:00:00Z');
  const offsetHours = (postId * 17 + 5) % 720;
  const date = new Date(base.getTime() - offsetHours * 3600_000);
  return date.toISOString();
}

export async function getFlowFeed(page: number, pageSize = 10): Promise<FlowFeedPage> {
  const [postsRes, users, photos] = await Promise.all([fetch(`${BASE}/posts?_page=${page}&_limit=${pageSize}`), fetchUsers(), fetchPhotos()]);

  const posts: JsonPlaceholderPost[] = await postsRes.json();
  const total = Number(postsRes.headers.get('x-total-count') || 100);

  const userMap = new Map(users.map((u) => [u.id, u]));

  const items: FlowItem[] = posts.map((post, indexInPage) => {
    const user = userMap.get(post.userId)!;
    const media = indexInPage === 1 ? [] : pickMediaForPost(post.id, photos);
    return {
      id: post.id,
      author: mapAuthor(user),
      body: post.body,
      media,
      likes: (post.id * 31 + 7) % 200,
      comments: (post.id * 13 + 3) % 50,
      liked: false,
      createdAt: generateCreatedAt(post.id),
    };
  });

  return { items, total, page, pageSize };
}
