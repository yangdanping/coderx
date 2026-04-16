import { collectArticleMediaRefs, type ArticleStructuredContent } from '@/service/article/article.content';
import { extractImagesFromHtml, extractVideoIdsFromHtml, extractVideoReferencesFromHtml } from '@/utils';

import type { DraftMeta, TiptapDocContent } from '@/service/draft/draft.types';
import type { IArticleImg, Itag } from '@/stores/types/article.result';

export const EMPTY_TIPTAP_DOC: TiptapDocContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

const dedupePositiveIds = (ids: Array<number | null | undefined>) =>
  Array.from(new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)));

const normalizeMediaUrl = (url?: string | null) => {
  if (!url) return '';
  const normalizedUrl = url.split('?')[0]?.trim() ?? '';
  if (!normalizedUrl) return '';
  if (normalizedUrl.startsWith('blob:')) return normalizedUrl;

  try {
    const parsed = normalizedUrl.startsWith('/') ? new URL(normalizedUrl, 'http://local.test') : new URL(normalizedUrl);
    return parsed.pathname.replace(/^\/dev-api/, '');
  } catch {
    return normalizedUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/dev-api/, '');
  }
};

type ArticleVideoLike = {
  id?: number;
  url?: string;
};

export const normalizeTiptapDoc = (content?: unknown): TiptapDocContent => {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content as TiptapDocContent;
  }

  return EMPTY_TIPTAP_DOC;
};

export const buildDraftMeta = ({
  selectedTagNames,
  availableTags,
  existingImageIds = [],
  existingVideoIds = [],
  pendingImageIds,
  pendingVideoIds,
  coverImageId,
}: {
  selectedTagNames: string[];
  availableTags: Itag[];
  existingImageIds?: number[];
  existingVideoIds?: number[];
  pendingImageIds: number[];
  pendingVideoIds: number[];
  coverImageId: number | null;
}): DraftMeta => {
  const selectedTagIds = selectedTagNames.reduce<number[]>((result, tagName) => {
    const matchedTag = availableTags.find((tag) => tag.name === tagName);
    if (matchedTag?.id) {
      result.push(matchedTag.id);
    }
    return result;
  }, []);

  return {
    imageIds: dedupePositiveIds([...existingImageIds, ...pendingImageIds]),
    videoIds: dedupePositiveIds([...existingVideoIds, ...pendingVideoIds]),
    coverImageId: Number.isInteger(coverImageId) && coverImageId! > 0 ? coverImageId : null,
    selectedTagIds: dedupePositiveIds(selectedTagIds),
  };
};

export const resolveReferencedArticleMediaIds = ({
  contentJson,
  htmlContent,
  articleImages = [],
  articleVideos = [],
}: {
  contentJson?: ArticleStructuredContent;
  htmlContent?: string;
  articleImages?: IArticleImg[];
  articleVideos?: ArticleVideoLike[];
}) => {
  const structuredRefs = contentJson ? collectArticleMediaRefs(contentJson) : null;
  const imageUrls = new Set(
    structuredRefs
      ? structuredRefs.images
          .filter((imageRef) => !imageRef.imageId)
          .map((imageRef) => normalizeMediaUrl(imageRef.src))
      : extractImagesFromHtml(htmlContent ?? '').map((url) => normalizeMediaUrl(url)),
  );
  const explicitImageIds = new Set(
    structuredRefs?.images
      .map((imageRef) => imageRef.imageId)
      .filter((imageId): imageId is number => typeof imageId === 'number' && Number.isInteger(imageId) && imageId > 0) ?? [],
  );
  const explicitVideoIds = new Set(
    structuredRefs?.videos
      .map((videoRef) => videoRef.videoId)
      .filter((videoId): videoId is number => typeof videoId === 'number' && Number.isInteger(videoId) && videoId > 0) ?? extractVideoIdsFromHtml(htmlContent ?? ''),
  );
  const legacyVideoUrls = new Set(
    structuredRefs
      ? structuredRefs.videos
          .filter((videoRef) => !videoRef.videoId)
          .map((videoRef) => normalizeMediaUrl(videoRef.src))
      : extractVideoReferencesFromHtml(htmlContent ?? '')
          .filter((reference) => !reference.videoId)
          .map((reference) => normalizeMediaUrl(reference.src)),
  );

  return {
    imageIds: dedupePositiveIds(
      articleImages.map((image) => {
        if (image.id && explicitImageIds.has(image.id)) {
          return image.id;
        }

        return imageUrls.has(normalizeMediaUrl(image.url)) ? image.id : null;
      }),
    ),
    videoIds: dedupePositiveIds(
      articleVideos.map((video) => {
        if (video.id && explicitVideoIds.has(video.id)) {
          return video.id;
        }

        return legacyVideoUrls.has(normalizeMediaUrl(video.url)) ? video.id : null;
      }),
    ),
  };
};

export const resolveSelectedTagNames = (selectedTagIds: number[], availableTags: Itag[]) =>
  dedupePositiveIds(selectedTagIds)
    .map((tagId) => availableTags.find((tag) => tag.id === tagId)?.name ?? null)
    .filter((tagName): tagName is string => !!tagName);
