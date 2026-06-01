import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DetailContent from '../DetailContent.vue';

const passthroughStub = {
  template: '<div><slot /></div>',
};

const mountDetailContent = () =>
  mount(DetailContent, {
    attachTo: document.body,
    props: {
      status: 'success',
      article: {
        id: 138,
        title: 'Selection article',
        author: {},
        contentHtml: '<p>Browser UI test article for comment reply notification.</p>',
      } as any,
    },
    global: {
      directives: {
        'dompurify-html': (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: {
        Avatar: passthroughStub,
        ElSkeleton: {
          template: '<div><slot /></div>',
        },
        ElContainer: passthroughStub,
        ElMain: passthroughStub,
        ElImageViewer: passthroughStub,
        DetailContentSkeleton: passthroughStub,
      },
    },
  });

const getTeleportedTooltip = () => {
  const tooltip = document.body.querySelector<HTMLElement>('.selection-context-tooltip');
  expect(tooltip).toBeTruthy();
  return tooltip as HTMLElement;
};

describe('DetailContent selection context tooltip', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('shows the add-context tooltip when the article selection changes', async () => {
    const wrapper = mountDetailContent();
    await nextTick();

    const contentRoot = wrapper.get('.editor-content-view').element;
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'comment reply notification',
      getRangeAt: () => ({
        commonAncestorContainer: contentRoot,
        getBoundingClientRect: () => ({
          width: 160,
          height: 22,
          right: 320,
          bottom: 180,
        }),
      }),
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('selectionchange'));
    await nextTick();

    const tooltip = getTeleportedTooltip();
    expect(tooltip.getAttribute('style')).toContain('left:');
    expect(tooltip.getAttribute('style')).not.toContain('display: none');
  });

  it('accepts article selections whose common ancestor is outside the content root', async () => {
    const wrapper = mountDetailContent();
    await nextTick();

    const contentRoot = wrapper.get('.editor-content-view').element;
    const textNode = contentRoot.querySelector('p')?.firstChild ?? contentRoot;
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      anchorNode: textNode,
      focusNode: textNode,
      toString: () => 'comment reply notification',
      getRangeAt: () => ({
        commonAncestorContainer: document.body,
        getBoundingClientRect: () => ({
          width: 160,
          height: 22,
          right: 320,
          bottom: 180,
        }),
      }),
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('selectionchange'));
    await nextTick();

    expect(getTeleportedTooltip().getAttribute('style')).not.toContain('display: none');
  });

  it('uses client rects when the selection bounding rect is empty', async () => {
    const wrapper = mountDetailContent();
    await nextTick();

    const contentRoot = wrapper.get('.editor-content-view').element;
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'comment reply notification',
      getRangeAt: () => ({
        commonAncestorContainer: contentRoot,
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          right: 0,
          bottom: 0,
        }),
        getClientRects: () =>
          [
            {
              width: 150,
              height: 20,
              right: 340,
              bottom: 190,
            },
          ] as unknown as DOMRectList,
      }),
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('selectionchange'));
    await nextTick();

    const tooltip = getTeleportedTooltip();
    expect(tooltip.getAttribute('style')).toContain('left: 348px');
    expect(tooltip.getAttribute('style')).not.toContain('display: none');
  });

  it('renders the add-context tooltip at the document root so it stays clickable outside the article box', async () => {
    mountDetailContent();
    await nextTick();

    expect(document.body.querySelector(':scope > .selection-context-tooltip')).toBeTruthy();
  });
});
