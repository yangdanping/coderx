import { describe, expect, it } from 'vitest';

import { buildDraftMeta, resolveReferencedArticleMediaIds, resolveSelectedTagNames } from '../draft.utils';

describe('draft.utils', () => {
  it('buildDraftMeta maps selected tag names to ids and dedupes existing and pending media ids', () => {
    const meta = buildDraftMeta({
      selectedTagNames: ['Vue', 'AI', 'Missing'],
      availableTags: [
        { id: 1, name: 'Vue' },
        { id: 2, name: 'AI' },
        { id: 3, name: 'PG' },
      ],
      existingImageIds: [5, 11],
      existingVideoIds: [9, 21],
      pendingImageIds: [11, 11, 12],
      pendingVideoIds: [21, 21, 22],
      coverImageId: 99,
    });

    expect(meta).toEqual({
      imageIds: [5, 11, 12],
      videoIds: [9, 21, 22],
      coverImageId: 99,
      selectedTagIds: [1, 2],
    });
  });

  it('resolveReferencedArticleMediaIds maps current html media urls back to existing article media ids', () => {
    const mediaIds = resolveReferencedArticleMediaIds({
      htmlContent: `
        <p>正文</p>
        <img src="https://api.example/article/images/keep.jpg" />
        <video src="https://api.example/article/video/keep.mp4"></video>
        <video src="blob:http://localhost/temp-video"></video>
      `,
      articleImages: [
        { id: 11, url: 'https://api.example/article/images/keep.jpg' },
        { id: 12, url: 'https://api.example/article/images/removed.jpg' },
      ],
      articleVideos: [
        { id: 21, url: 'https://api.example/article/video/keep.mp4' },
        { id: 22, url: 'https://api.example/article/video/removed.mp4' },
      ],
    });

    expect(mediaIds).toEqual({
      imageIds: [11],
      videoIds: [21],
    });
  });

  it('resolveReferencedArticleMediaIds matches proxied editor urls to absolute article media urls', () => {
    const mediaIds = resolveReferencedArticleMediaIds({
      htmlContent: `
        <p>正文</p>
        <img src="/dev-api/article/images/keep.jpg" />
        <video src="/dev-api/article/video/keep.mp4"></video>
      `,
      articleImages: [
        { id: 31, url: 'http://192.168.3.96:8000/article/images/keep.jpg' },
        { id: 32, url: 'http://192.168.3.96:8000/article/images/removed.jpg' },
      ],
      articleVideos: [
        { id: 41, url: 'http://192.168.3.96:8000/article/video/keep.mp4' },
        { id: 42, url: 'http://192.168.3.96:8000/article/video/removed.mp4' },
      ],
    });

    expect(mediaIds).toEqual({
      imageIds: [31],
      videoIds: [41],
    });
  });

  it('resolveReferencedArticleMediaIds prefers explicit data-video-id over src url matching', () => {
    const mediaIds = resolveReferencedArticleMediaIds({
      htmlContent: `
        <p>正文</p>
        <video data-video-id="21" src="https://api.example/article/video/removed.mp4"></video>
      `,
      articleVideos: [
        { id: 21, url: 'https://api.example/article/video/keep.mp4' },
        { id: 22, url: 'https://api.example/article/video/removed.mp4' },
      ],
    });

    expect(mediaIds).toEqual({
      imageIds: [],
      videoIds: [21],
    });
  });

  it('resolveSelectedTagNames restores tag names by selected ids and ignores missing ids', () => {
    const selectedTagNames = resolveSelectedTagNames([2, 99, 1], [
      { id: 1, name: 'Vue' },
      { id: 2, name: 'AI' },
      { id: 3, name: 'PG' },
    ]);

    expect(selectedTagNames).toEqual(['AI', 'Vue']);
  });
});
