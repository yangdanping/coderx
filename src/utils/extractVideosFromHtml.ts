export type HtmlVideoReference = {
  rawTag: string;
  src: string | null;
  videoId: number | null;
};

const VIDEO_TAG_REGEX = /<video\b[^>]*>/gi;

const getHtmlAttribute = (tag: string, attributeName: string) => {
  const match = new RegExp(`${attributeName}=["']([^"']*)["']`, 'i').exec(tag);
  const value = match?.[1]?.trim();
  return value || null;
};

const normalizeVideoId = (videoId: unknown) => {
  const normalizedId = Number(videoId);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

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

export const extractVideoReferencesFromHtml = (html: string): HtmlVideoReference[] => {
  if (!html) return [];

  const references: HtmlVideoReference[] = [];
  VIDEO_TAG_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = VIDEO_TAG_REGEX.exec(html)) !== null) {
    const rawTag = match[0];
    references.push({
      rawTag,
      src: getHtmlAttribute(rawTag, 'src'),
      videoId: normalizeVideoId(getHtmlAttribute(rawTag, 'data-video-id')),
    });
  }

  return references;
};

export const extractVideoIdsFromHtml = (html: string): number[] =>
  Array.from(
    new Set(
      extractVideoReferencesFromHtml(html)
        .map((reference) => reference.videoId)
        .filter((videoId): videoId is number => Number.isInteger(videoId) && videoId > 0),
    ),
  );

export const annotateLegacyVideoIdsInHtml = (
  html: string,
  articleVideos: Array<{ id?: number; url?: string }> = [],
) => {
  if (!html || !articleVideos.length) return html;

  return html.replace(VIDEO_TAG_REGEX, (rawTag) => {
    if (getHtmlAttribute(rawTag, 'data-video-id')) {
      return rawTag;
    }

    const src = getHtmlAttribute(rawTag, 'src');
    if (!src) {
      return rawTag;
    }

    const matchedVideo = articleVideos.find((video) => {
      if (!video?.id || !video.url) return false;
      return normalizeMediaUrl(video.url) === normalizeMediaUrl(src);
    });

    if (!matchedVideo?.id) {
      return rawTag;
    }

    return rawTag.replace(/^<video\b/i, `<video data-video-id="${matchedVideo.id}"`);
  });
};

/**
 * 从HTML内容中提取所有视频的URL
 * @param html HTML内容字符串
 * @returns 视频URL数组
 */
export default function extractVideosFromHtml(html: string): string[] {
  return extractVideoReferencesFromHtml(html)
    .map((reference) => reference.src)
    .filter((url): url is string => !!url && !url.startsWith('data:') && !url.startsWith('blob:'));
}
