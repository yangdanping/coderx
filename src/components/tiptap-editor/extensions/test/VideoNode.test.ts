import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeSelection } from '@tiptap/pm/state';

const { getVideoMetaByIdMock } = vi.hoisted(() => ({
  getVideoMetaByIdMock: vi.fn(),
}));

vi.mock('@/stores/editor.store', () => ({
  getVideoMetaById: getVideoMetaByIdMock,
  default: vi.fn(),
}));

import { VideoNode, selectVideoNodeOnMouseDown } from '../VideoNode';

const renderMarkdown = VideoNode.config.renderMarkdown as unknown as (
  node: { attrs: Record<string, unknown> },
  helpers: unknown,
  context: unknown,
) => string;
const addAttributes = VideoNode.config.addAttributes as unknown as () => {
  videoId?: {
    parseHTML?: (element: HTMLElement) => unknown;
    renderHTML?: (attrs: { videoId: number }) => Record<string, string>;
  };
};

describe('VideoNode', () => {
  beforeEach(() => {
    getVideoMetaByIdMock.mockReset();
    vi.restoreAllMocks();
  });

  it('serializes video nodes into stable markdown tokens when videoId exists', () => {
    const markdown = renderMarkdown(
      {
        attrs: {
          videoId: 123,
          src: 'http://example.com/demo.mp4',
          poster: 'http://example.com/demo.jpg',
          controls: true,
          style: 'width: 360px; max-width: 100%; height: auto;',
        },
      },
      undefined,
      undefined,
    );

    expect(markdown).toBe('[[video:123]]\n\n');
  });

  it('falls back to raw html when legacy video nodes have no videoId', () => {
    const markdown = renderMarkdown(
      {
        attrs: {
          src: 'http://example.com/demo.mp4',
          poster: 'http://example.com/demo.jpg',
          controls: true,
          style: 'width: 360px; max-width: 100%; height: auto;',
        },
      },
      undefined,
      undefined,
    );

    expect(markdown).toContain('<video');
    expect(markdown).toContain('src="http://example.com/demo.mp4"');
    expect(markdown).not.toContain('[[video:');
  });

  it('reads and writes data-video-id attributes in html mode', () => {
    const attributes = addAttributes();
    const element = document.createElement('video');
    element.setAttribute('data-video-id', '123');

    expect(attributes?.videoId?.parseHTML?.(element)).toBe(123);
    expect(attributes?.videoId?.renderHTML?.({ videoId: 123 })).toEqual({
      'data-video-id': '123',
    });
  });

  it('tokenizes stable video markdown blocks', () => {
    const token = VideoNode.config.markdownTokenizer?.tokenize?.(
      '[[video:123]]\n',
      [],
      {
        inlineTokens: () => [],
        blockTokens: () => [],
      },
    );

    expect(token).toMatchObject({
      type: 'video',
      raw: '[[video:123]]\n',
      videoId: 123,
    });
  });

  it('restores a video node from markdown tokens using registry metadata', () => {
    getVideoMetaByIdMock.mockReturnValue({
      videoId: 123,
      src: 'http://example.com/demo.mp4',
      poster: 'http://example.com/demo.jpg',
      controls: true,
      style: 'width: 360px; max-width: 100%; height: auto;',
    });

    const result = VideoNode.config.parseMarkdown?.(
      {
        raw: '[[video:123]]',
        videoId: 123,
      } as never,
      {
        createNode: (type: string, attrs?: Record<string, unknown>, content?: unknown[]) => ({
          type,
          attrs,
          content,
        }),
        createTextNode: (text: string) => ({ type: 'text', text }),
      } as never,
    );

    expect(result).toEqual({
      type: 'video',
      attrs: {
        videoId: 123,
        src: 'http://example.com/demo.mp4',
        poster: 'http://example.com/demo.jpg',
        controls: true,
        style: 'width: 360px; max-width: 100%; height: auto;',
      },
      content: [],
    });
  });

  it('keeps unresolved video tokens visible instead of dropping them', () => {
    getVideoMetaByIdMock.mockReturnValue(undefined);

    const result = VideoNode.config.parseMarkdown?.(
      {
        raw: '[[video:999]]',
        videoId: 999,
      } as never,
      {
        createNode: (type: string, attrs?: Record<string, unknown>, content?: unknown[]) => ({
          type,
          attrs,
          content,
        }),
        createTextNode: (text: string) => ({ type: 'text', text }),
      } as never,
    );

    expect(result).toEqual([
      {
        type: 'paragraph',
        attrs: undefined,
        content: [{ type: 'text', text: '[[video:999]]' }],
      },
    ]);
  });

  it('selects the clicked video node so it can enter the same selected state as images', () => {
    const videoElement = document.createElement('video');
    const nodeSelectionCreateSpy = vi.spyOn(NodeSelection, 'create').mockReturnValue('node-selection' as never);
    const setSelectionMock = vi.fn(() => 'next-transaction');
    const dispatchMock = vi.fn();
    const focusMock = vi.fn();

    const event = new MouseEvent('mousedown');
    Object.defineProperty(event, 'target', {
      configurable: true,
      value: videoElement,
    });
    Object.defineProperty(event, 'composedPath', {
      configurable: true,
      value: () => [videoElement],
    });

    const result = selectVideoNodeOnMouseDown(
      {
        posAtDOM: vi.fn(() => 5),
        state: {
          doc: {
            resolve: vi.fn(),
          },
          tr: {
            setSelection: setSelectionMock,
          },
        },
        dispatch: dispatchMock,
        focus: focusMock,
      } as never,
      event,
    );

    expect(result).toBe(false);
    expect(nodeSelectionCreateSpy).toHaveBeenCalledTimes(1);
    expect(setSelectionMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith('next-transaction');
    expect(focusMock).toHaveBeenCalledTimes(1);
  });

  it('ignores mouse events that do not originate from a video element', () => {
    const div = document.createElement('div');
    const event = new MouseEvent('mousedown');
    Object.defineProperty(event, 'target', {
      configurable: true,
      value: div,
    });
    Object.defineProperty(event, 'composedPath', {
      configurable: true,
      value: () => [div],
    });

    const dispatchMock = vi.fn();
    const result = selectVideoNodeOnMouseDown(
      {
        posAtDOM: vi.fn(),
        state: {
          doc: {},
          tr: {
            setSelection: vi.fn(),
          },
        },
        dispatch: dispatchMock,
        focus: vi.fn(),
      } as never,
      event,
    );

    expect(result).toBe(false);
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
