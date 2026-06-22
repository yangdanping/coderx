import { mount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FeatureCard from '../FeatureCard.vue';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  intersect(isIntersecting = true) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

describe('FeatureCard note header', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
    vi.stubGlobal('ResizeObserver', MockResizeObserver as unknown as typeof ResizeObserver);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mountCard() {
    return mount(FeatureCard, {
      props: {
        index: 1,
        title: '浏览文章自动目录划分',
        description: '进入文章后，目录会自动提取章节并辅助定位。',
      },
      slots: {
        default: '<div class="demo-content">demo</div>',
      },
    });
  }

  it('keeps the feature copy inside a yellow paper note with a decorative guide arrow', () => {
    const wrapper = mountCard();
    const note = wrapper.get('.feature-card__note');
    const guide = wrapper.get('svg.feature-card__guide');

    expect(note.get('.feature-card__eyebrow').text()).toBe('Feature 01');
    expect(note.get('h3.feature-card__title').text()).toBe('浏览文章自动目录划分');
    expect(note.get('p.feature-card__description').text()).toContain('目录会自动提取章节');
    expect(guide.attributes('aria-hidden')).toBe('true');
    expect(guide.find('.feature-card__guide-path').exists()).toBe(true);
    expect(guide.find('.feature-card__guide-head').exists()).toBe(true);
    expect(wrapper.find('.feature-card__header-dots').exists()).toBe(false);
  });

  it('reveals the note and starts the one-shot guide animation on first intersection', async () => {
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).not.toContain('visible');

    MockIntersectionObserver.instances.at(-1)?.intersect();
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('visible');
    expect(wrapper.get('.feature-card__note').classes()).toContain('feature-card__note');
    expect(wrapper.get('.feature-card__guide-path').classes()).toContain('feature-card__guide-path');
  });

  it('defines the requested palette, one-shot drawing, responsive layout, dark mode, and reduced-motion fallback', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/features/FeatureCard.vue'), 'utf8');

    expect(source).toContain('253 214 99');
    expect(source).toContain('stroke-dashoffset');
    expect(source).toContain('feature-card-guide-draw');
    expect(source).toContain('animation-iteration-count: 1');
    expect(source).toContain(':where(html.dark) &');
    expect(source).toContain('@media (max-width: 768px)');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
