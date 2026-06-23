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
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
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

  function mountCard(noteSide: 'left' | 'right' = 'left', noteCurlAngle?: number) {
    return mount(FeatureCard, {
      props: {
        index: 1,
        title: '浏览文章自动目录划分',
        description: '进入文章后，目录会自动提取章节并辅助定位。',
        noteSide,
        noteCurlAngle,
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

  it('exposes the requested side as an explicit layout class', () => {
    expect(mountCard('left').classes()).toContain('is-note-left');
    expect(mountCard('right').classes()).toContain('is-note-right');
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

  it('keeps the desktop guide in the gap, delays its loop, and separates the lower arrow arm', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/features/FeatureCard.vue'), 'utf8');
    const wrapper = mountCard();
    const pathData = wrapper.get('.feature-card__guide-path--desktop').attributes('d');
    const headData = wrapper.get('.feature-card__guide-head--desktop').attributes('d');

    expect(source).toContain('--guide-ink: rgb(190 224 198');
    expect(source).toMatch(/stroke-dasharray:\s*1;/);
    expect(source).not.toContain('stroke-dasharray: 0.025 0.055');
    expect(source).toContain('feature-card-guide-draw 2400ms');
    expect(source).toContain('calc(var(--guide-delay) + 2360ms)');
    expect(source).toContain('animation-iteration-count: 1');
    expect(source).toContain('left: calc(100% - 48px)');
    expect(source).toContain('right: calc(100% - 48px)');
    expect(pathData).toMatch(/^M154 19C143 19 132 20 121 24/);
    expect(pathData.match(/C/g)).toHaveLength(7);
    expect(headData).toBe('M31 43C24 49 18 54 14 57C22 61 30 64 40 65');
  });

  it('restores the legacy unified glass card on mobile while keeping desktop note artwork', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/features/FeatureCard.vue'), 'utf8');
    const wrapper = mountCard();

    expect(wrapper.get('.feature-card__title .marker--title').text()).toBe('浏览文章自动目录划分');
    expect(wrapper.get('.feature-card__description .marker--desc').text()).toContain('目录会自动提取章节');
    expect(source).toContain('feature-card__guide-path--desktop');
    expect(source).not.toContain('&__guide-path--mobile');
    expect(source).toContain('@include glass-effect');
    expect(source).toContain('background-image: radial-gradient');
    expect(source).toContain('background: transparent');
    expect(source).toContain('-webkit-backdrop-filter: none');
    expect(source).toContain('background-size: 100% 8px');
    expect(source).toMatch(/&__guide\s*\{\s*display:\s*none;/);
    expect(source).toMatch(/&__note\s*\{[\s\S]*?border:\s*0;/);
    expect(source).toMatch(/&__panel\s*\{[\s\S]*?mask-image:\s*none;/);
    expect(source).toContain('min-height: 640px');
  });

  it('exposes a developer-adjustable curl angle and mirrors it toward each outer lower edge', () => {
    const leftStyle = mountCard('left', 6).attributes('style');
    const rightStyle = mountCard('right', 6).attributes('style');
    const defaultStyle = mountCard('left').attributes('style');

    expect(leftStyle).toContain('--note-curl-tilt-y: -6deg');
    expect(rightStyle).toContain('--note-curl-tilt-y: 6deg');
    expect(defaultStyle).toContain('--note-curl-tilt-y: -4deg');
  });

  it('keeps a complete rectangular note and emphasizes the lifted paper underside', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/features/FeatureCard.vue'), 'utf8');

    expect(source).toContain('253 214 99');
    expect(source).toContain('backdrop-filter');
    expect(source).not.toContain('var(--paper-noise)');
    expect(source).not.toContain('clip-path: polygon(0 0, 100% 0');
    expect(source).not.toContain('clip-path: polygon(100% 0, 0 100%, 100% 100%)');
    expect(source).toContain('transform-style: preserve-3d');
    expect(source).toContain('--note-curl-left: -3%');
    expect(source).toContain('--note-curl-right: -3%');
    expect(source).toContain('noteCurlAngle?: number');
    expect(source).toContain('便签外侧下缘的翘曲角度');
    expect(source).toContain('width: 66%');
    expect(source).toContain('height: 32px');
    expect(source).toContain('radial-gradient');
    expect(source).toContain('filter: blur(');
    expect(source).toContain('&.is-note-left');
    expect(source).toContain('&.is-note-right');
    expect(source).toContain(':where(html.dark) &');
    expect(source).toContain('@media (max-width: 768px)');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
