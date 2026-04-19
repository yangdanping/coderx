import Image from '@tiptap/extension-image';

import type { ImageNodeAttrs } from './types';

const escapeHtmlAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const normalizeImageId = (imageId: unknown) => {
  const normalizedId = Number(imageId);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

export const buildImageHtml = (imageAttrs: Partial<ImageNodeAttrs>) => {
  const src = typeof imageAttrs.src === 'string' ? imageAttrs.src.trim() : '';
  if (!src) return '';

  const imageId = normalizeImageId(imageAttrs.imageId);
  const alt = typeof imageAttrs.alt === 'string' ? imageAttrs.alt : '';
  const title = typeof imageAttrs.title === 'string' ? imageAttrs.title : '';
  const attributes = [
    imageId ? `data-image-id="${imageId}"` : '',
    `src="${escapeHtmlAttribute(src)}"`,
    `alt="${escapeHtmlAttribute(alt)}"`,
    title ? `title="${escapeHtmlAttribute(title)}"` : '',
  ].filter(Boolean);

  return `<img ${attributes.join(' ')} />`;
};

export const ImageNode = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      imageId: {
        default: null,
        parseHTML: (element) => normalizeImageId(element.getAttribute('data-image-id')),
        renderHTML: (attributes) => {
          const imageId = normalizeImageId(attributes.imageId);
          return imageId ? { 'data-image-id': String(imageId) } : {};
        },
      },
    };
  },

  renderMarkdown(node) {
    return buildImageHtml(node.attrs ?? {});
  },
});

export default ImageNode;
