import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection, Plugin } from '@tiptap/pm/state';
import { getVideoMetaById } from '@/stores/editor.store';
import type { VideoNodeAttrs, VideoRegistryEntry } from '../types';

const escapeHtmlAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const normalizeVideoId = (videoId: unknown) => {
  const normalizedId = Number(videoId);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

interface VideoSelectionView {
  posAtDOM: (node: globalThis.Node, offset: number, bias?: number) => number;
  state: {
    doc: {
      resolve: (position: number) => {
        nodeAfter?: {
          type?: {
            spec?: {
              selectable?: boolean;
            };
          };
        } | null;
      };
    };
    tr: {
      setSelection: (selection: unknown) => unknown;
    };
  };
  dispatch: (transaction: unknown) => void;
  focus?: () => void;
}

const getVideoElementFromMouseEvent = (event: MouseEvent) => {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const fromPath = path.find((node) => node instanceof HTMLVideoElement);
  if (fromPath instanceof HTMLVideoElement) {
    return fromPath;
  }

  const target = event.target;
  if (target instanceof HTMLVideoElement) {
    return target;
  }

  if (target instanceof Element) {
    const closestVideo = target.closest('video');
    if (closestVideo instanceof HTMLVideoElement) {
      return closestVideo;
    }
  }

  return null;
};

export const selectVideoNodeOnMouseDown = (view: VideoSelectionView, event: MouseEvent) => {
  const videoElement = getVideoElementFromMouseEvent(event);
  if (!videoElement) {
    return false;
  }

  try {
    const nodePosition = view.posAtDOM(videoElement, 0);
    const transaction = view.state.tr.setSelection(NodeSelection.create(view.state.doc as never, nodePosition));
    view.dispatch(transaction);
    view.focus?.();
  } catch {
    return false;
  }

  return false;
};

export const DEFAULT_VIDEO_STYLE = 'width: 360px; max-width: 100%; height: auto;';
export const VIDEO_TOKEN_LINE_GLOBAL_PATTERN = /^\[\[video:(\d+)\]\][ \t]*$/gm;
const VIDEO_TOKEN_BLOCK_PATTERN = /^\[\[video:(\d+)\]\][ \t]*(?:\n|$)/;

export const buildVideoToken = (videoId: unknown) => {
  const normalizedId = normalizeVideoId(videoId);
  return normalizedId ? `[[video:${normalizedId}]]` : null;
};

export const buildVideoHtml = (videoAttrs: Partial<VideoNodeAttrs | VideoRegistryEntry>) => {
  const src = typeof videoAttrs.src === 'string' ? videoAttrs.src.trim() : '';
  if (!src) return '';

  const videoId = normalizeVideoId(videoAttrs.videoId);
  const poster = typeof videoAttrs.poster === 'string' ? videoAttrs.poster : '';
  const style = typeof videoAttrs.style === 'string' && videoAttrs.style.trim() ? videoAttrs.style : DEFAULT_VIDEO_STYLE;
  const controls = videoAttrs.controls !== false;
  const attributes = [
    videoId ? `data-video-id="${videoId}"` : '',
    `src="${escapeHtmlAttribute(src)}"`,
    poster ? `poster="${escapeHtmlAttribute(poster)}"` : '',
    controls ? 'controls' : '',
    style ? `style="${escapeHtmlAttribute(style)}"` : '',
  ].filter(Boolean);

  return `<video ${attributes.join(' ')}></video>`;
};

export const buildUnresolvedVideoPlaceholderHtml = (videoId: unknown) => {
  const normalizedId = normalizeVideoId(videoId);
  const label = normalizedId ? String(normalizedId) : String(videoId ?? '').trim() || 'unknown';
  return `<div class="markdown-video-placeholder" data-video-id="${escapeHtmlAttribute(String(label))}">未解析视频 ${escapeHtmlAttribute(String(label))}</div>`;
};

export const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      videoId: {
        default: null,
        parseHTML: (element) => normalizeVideoId(element.getAttribute('data-video-id')),
        renderHTML: (attributes) => {
          const videoId = normalizeVideoId(attributes.videoId);
          return videoId ? { 'data-video-id': String(videoId) } : {};
        },
      },
      poster: {
        default: null,
      },
      controls: {
        default: true,
        parseHTML: (element) => element.hasAttribute('controls'),
        renderHTML: (attributes) => {
          return attributes.controls ? { controls: '' } : {};
        },
      },
      style: {
        default: DEFAULT_VIDEO_STYLE,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (!(event instanceof MouseEvent)) {
                return false;
              }

              return selectVideoNodeOnMouseDown(view as unknown as VideoSelectionView, event);
            },
          },
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: 'video',
    level: 'block',
    start: (src: string) => src.indexOf('[[video:'),
    tokenize: (src) => {
      const match = VIDEO_TOKEN_BLOCK_PATTERN.exec(src);
      if (!match) return undefined;

      return {
        type: 'video',
        raw: match[0],
        videoId: Number(match[1]),
      };
    },
  },

  parseMarkdown(token, helpers) {
    const videoId = normalizeVideoId(token.videoId);
    const rawToken = typeof token.raw === 'string' ? token.raw.trim() : buildVideoToken(videoId) ?? '[[video:unknown]]';

    if (!videoId) {
      return [helpers.createNode('paragraph', undefined, [helpers.createTextNode(rawToken)])];
    }

    const videoMeta = getVideoMetaById(videoId);
    if (!videoMeta?.src) {
      return [helpers.createNode('paragraph', undefined, [helpers.createTextNode(rawToken)])];
    }

    return helpers.createNode(
      'video',
      {
        videoId,
        src: videoMeta.src,
        poster: videoMeta.poster ?? null,
        controls: videoMeta.controls !== false,
        style: videoMeta.style ?? DEFAULT_VIDEO_STYLE,
      },
      [],
    );
  },

  renderMarkdown(node) {
    const token = buildVideoToken(node.attrs?.videoId);
    if (token) {
      return `${token}\n\n`;
    }

    const html = buildVideoHtml(node.attrs ?? {});
    return html ? `${html}\n\n` : '';
  },
});

export default VideoNode;
