import type { IArticleImg, Itag } from '@/stores/types/article.result';
import type { DraftMeta, TiptapDocContent } from '@/service/draft/draft.types';
import { extractImagesFromHtml, extractVideoIdsFromHtml, extractVideoReferencesFromHtml } from '@/utils';

export const EMPTY_TIPTAP_DOC: TiptapDocContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

const dedupePositiveIds = (ids: Array<number | null | undefined>) =>
  Array.from(new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0)));

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
  htmlContent,
  articleImages = [],
  articleVideos = [],
}: {
  htmlContent: string;
  articleImages?: IArticleImg[];
  articleVideos?: ArticleVideoLike[];
}) => {
  const imageUrls = new Set(extractImagesFromHtml(htmlContent).map((url) => normalizeMediaUrl(url)));
  const explicitVideoIds = new Set(extractVideoIdsFromHtml(htmlContent));
  const legacyVideoUrls = new Set(
    extractVideoReferencesFromHtml(htmlContent)
      .filter((reference) => !reference.videoId)
      .map((reference) => normalizeMediaUrl(reference.src)),
  );

  return {
    imageIds: dedupePositiveIds(articleImages.map((image) => (imageUrls.has(normalizeMediaUrl(image.url)) ? image.id : null))),
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
