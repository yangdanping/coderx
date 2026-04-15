import { describe, expect, it } from 'vitest';

import {
  collectArticleMediaRefs,
  hasMeaningfulArticleContent,
  resolveArticleDetailHtml,
  resolveArticleEditorContent,
  resolveArticleExcerpt,
} from '../article.content';

describe('article.content contract', () => {
  it('prefers contentJson over legacy content when hydrating the editor', () => {
    const contentJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '来自结构化正文' }],
        },
      ],
    };

    expect(
      resolveArticleEditorContent({
        content: '<p>旧 HTML 正文</p>',
        contentJson,
      }),
    ).toEqual(contentJson);
  });

  it('prefers contentHtml over legacy content when rendering detail html', () => {
    expect(
      resolveArticleDetailHtml({
        content: '<p>旧内容</p>',
        contentHtml: '<p>来自后端派生 HTML</p>',
      }),
    ).toBe('<p>来自后端派生 HTML</p>');
  });

  it('prefers excerpt over legacy content when rendering list previews', () => {
    expect(
      resolveArticleExcerpt({
        content: '<p>旧摘要来源</p>',
        excerpt: '新的派生摘要',
      }),
    ).toBe('新的派生摘要');
  });

  it('collects stable image and video references from structured content', () => {
    expect(
      collectArticleMediaRefs({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '结构化正文' }],
          },
          {
            type: 'image',
            attrs: {
              imageId: 11,
              src: 'https://api.example/article/images/keep.jpg',
            },
          },
          {
            type: 'image',
            attrs: {
              src: '/dev-api/article/images/legacy.jpg',
            },
          },
          {
            type: 'video',
            attrs: {
              videoId: 21,
              src: 'https://api.example/article/video/keep.mp4',
            },
          },
          {
            type: 'video',
            attrs: {
              src: '/dev-api/article/video/legacy.mp4',
            },
          },
        ],
      }),
    ).toEqual({
      images: [
        { imageId: 11, src: 'https://api.example/article/images/keep.jpg' },
        { imageId: null, src: '/dev-api/article/images/legacy.jpg' },
      ],
      videos: [
        { videoId: 21, src: 'https://api.example/article/video/keep.mp4' },
        { videoId: null, src: '/dev-api/article/video/legacy.mp4' },
      ],
    });
  });

  it('treats empty docs as blank and media-bearing docs as meaningful', () => {
    expect(
      hasMeaningfulArticleContent({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
    ).toBe(false);

    expect(
      hasMeaningfulArticleContent({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: {
              imageId: 11,
              src: 'https://api.example/article/images/keep.jpg',
            },
          },
        ],
      }),
    ).toBe(true);
  });

  it('does not fall back to legacy content after the cutover', () => {
    expect(resolveArticleDetailHtml({ content: '<p>旧内容</p>' })).toBe('');
    expect(resolveArticleExcerpt({ content: '旧摘要' })).toBe('');
    expect(resolveArticleEditorContent({ content: '<p>旧编辑内容</p>' })).toBe('');
  });
});
