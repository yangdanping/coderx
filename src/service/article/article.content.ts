import type { TiptapDocContent } from '@/service/draft/draft.types';

export type ArticleStructuredContent = TiptapDocContent;

export interface ArticleImageNodeAttrs {
  imageId?: number | null;
  src?: string | null;
  alt?: string | null;
  title?: string | null;
}

export interface ArticleVideoNodeAttrs {
  videoId?: number | null;
  src?: string | null;
  poster?: string | null;
  controls?: boolean;
  style?: string | null;
}

export interface ArticleContentFields {
  content?: string;
  contentJson?: ArticleStructuredContent;
  contentHtml?: string;
  excerpt?: string;
}

export interface ArticleImageRef {
  imageId: number | null;
  src: string | null;
}

export interface ArticleVideoRef {
  videoId: number | null;
  src: string | null;
}

export interface ArticleMediaRefs {
  images: ArticleImageRef[];
  videos: ArticleVideoRef[];
}

const normalizePositiveId = (value: unknown) => {
  const normalizedId = Number(value);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

const getNodeAttrs = (node?: TiptapDocContent | null): Record<string, unknown> => {
  const attrs = node?.attrs;
  return attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? (attrs as Record<string, unknown>) : {};
};

const visitStructuredContentNode = (node: TiptapDocContent | undefined, refs: ArticleMediaRefs) => {
  if (!node || typeof node !== 'object') return;

  const attrs = getNodeAttrs(node);

  if (node.type === 'image') {
    refs.images.push({
      imageId: normalizePositiveId(attrs['imageId'] ?? attrs['imgId']),
      src: typeof attrs['src'] === 'string' ? attrs['src'] : null,
    });
  }

  if (node.type === 'video') {
    refs.videos.push({
      videoId: normalizePositiveId(attrs['videoId']),
      src: typeof attrs['src'] === 'string' ? attrs['src'] : null,
    });
  }

  node.content?.forEach((childNode) => {
    if (childNode && typeof childNode === 'object' && !Array.isArray(childNode)) {
      visitStructuredContentNode(childNode as TiptapDocContent, refs);
    }
  });
};

const nodeHasMeaningfulContent = (node?: TiptapDocContent | null): boolean => {
  if (!node || typeof node !== 'object') return false;

  if (node.type === 'text') {
    const text = typeof node.text === 'string' ? node.text : '';
    return text.trim().length > 0;
  }

  if (node.type === 'image' || node.type === 'video') {
    const attrs = getNodeAttrs(node);
    return Boolean(normalizePositiveId(attrs['imageId'] ?? attrs['imgId'] ?? attrs['videoId']) || (typeof attrs['src'] === 'string' && attrs['src'].trim()));
  }

  return node.content?.some((childNode) => nodeHasMeaningfulContent(childNode as TiptapDocContent)) ?? false;
};

export const resolveArticleEditorContent = (article?: ArticleContentFields | null): ArticleStructuredContent | string => {
  return article?.contentJson ?? '';
};

export const resolveArticleDetailHtml = (article?: ArticleContentFields | null): string => {
  return article?.contentHtml ?? '';
};

export const resolveArticleExcerpt = (article?: ArticleContentFields | null): string => {
  return article?.excerpt ?? '';
};

export const collectArticleMediaRefs = (content?: ArticleStructuredContent | null): ArticleMediaRefs => {
  const refs: ArticleMediaRefs = {
    images: [],
    videos: [],
  };

  visitStructuredContentNode(content, refs);
  return refs;
};

export const hasMeaningfulArticleContent = (content?: ArticleStructuredContent | null): boolean => {
  return nodeHasMeaningfulContent(content);
};
