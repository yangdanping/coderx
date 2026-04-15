import { describe, expect, it } from 'vitest';

import { buildImageHtml, ImageNode } from '../ImageNode';

const addAttributes = ImageNode.config.addAttributes as unknown as () => {
  imageId?: {
    parseHTML?: (element: HTMLElement) => unknown;
    renderHTML?: (attrs: { imageId: number }) => Record<string, string>;
  };
};

const renderMarkdown = ImageNode.config.renderMarkdown as unknown as (node: {
  attrs?: {
    imageId?: number;
    src?: string;
    alt?: string;
    title?: string;
  };
}) => string;

describe('ImageNode', () => {
  it('reads and writes data-image-id attributes in html mode', () => {
    const attributes = addAttributes();
    const element = document.createElement('img');
    element.setAttribute('data-image-id', '123');

    expect(attributes?.imageId?.parseHTML?.(element)).toBe(123);
    expect(attributes?.imageId?.renderHTML?.({ imageId: 123 })).toEqual({
      'data-image-id': '123',
    });
  });

  it('renders markdown as raw html so imageId survives split preview round trips', () => {
    expect(
      renderMarkdown({
        attrs: {
          imageId: 123,
          src: 'http://example.com/demo.jpg',
          alt: '封面图',
          title: '标题图',
        },
      }),
    ).toBe('<img data-image-id="123" src="http://example.com/demo.jpg" alt="封面图" title="标题图" />');
  });

  it('buildImageHtml omits the stable id attribute when the node has no imageId', () => {
    expect(
      buildImageHtml({
        src: 'http://example.com/demo.jpg',
        alt: '',
      }),
    ).toBe('<img src="http://example.com/demo.jpg" alt="" />');
  });
});
