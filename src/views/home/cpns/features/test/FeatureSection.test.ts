import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import FeatureSection from '../FeatureSection.vue';

const FeatureCardStub = defineComponent({
  name: 'FeatureCard',
  props: {
    noteSide: String,
    noteCurlAngle: Number,
  },
  template: '<article class="feature-card-stub"><slot /></article>',
});

const DemoStub = defineComponent({
  template: '<div class="demo-stub" />',
});

describe('FeatureSection', () => {
  it('keeps the desktop arrow anchor and restores the legacy mobile section heading', () => {
    const wrapper = mount(FeatureSection, {
      global: {
        stubs: {
          FeatureCard: FeatureCardStub,
          ArticleTocDemo: DemoStub,
          AiChatDemo: DemoStub,
          AiCompletionDemo: DemoStub,
          MarkdownRenderDemo: DemoStub,
        },
      },
    });

    const anchor = wrapper.get('a#features');

    expect(anchor.attributes('href')).toBe('#features');
    expect(anchor.attributes('aria-label')).toBe('进入核心特性');
    expect(anchor.find('svg.feature-section-anchor__arrow').exists()).toBe(true);
    expect(anchor.classes()).toContain('feature-section__desktop-anchor');
    expect(wrapper.get('.feature-section__mobile-heading').text()).toContain('How to Play');
    expect(wrapper.get('.feature-section__intro').text()).toBe('快速感受社区的核心交互');

    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/features/FeatureSection.vue'), 'utf8');

    expect(source).toContain('&__mobile-heading');
    expect(source).toContain('&__desktop-anchor');
    expect(source).toContain('clip-path: inset(50%)');
    expect(source).toContain('visibility: hidden');
  });

  it('alternates feature notes between the left and right sides', () => {
    const wrapper = mount(FeatureSection, {
      global: {
        stubs: {
          FeatureCard: FeatureCardStub,
          ArticleTocDemo: DemoStub,
          AiChatDemo: DemoStub,
          AiCompletionDemo: DemoStub,
          MarkdownRenderDemo: DemoStub,
        },
      },
    });

    expect(wrapper.findAllComponents(FeatureCardStub).map((card) => card.props('noteSide'))).toEqual(['left', 'right', 'left', 'right']);
  });

  it('passes the developer-configurable note curl angle to every card', () => {
    const wrapper = mount(FeatureSection, {
      props: {
        noteCurlAngle: 6,
      },
      global: {
        stubs: {
          FeatureCard: FeatureCardStub,
          ArticleTocDemo: DemoStub,
          AiChatDemo: DemoStub,
          AiCompletionDemo: DemoStub,
          MarkdownRenderDemo: DemoStub,
        },
      },
    });

    expect(wrapper.findAllComponents(FeatureCardStub).map((card) => card.props('noteCurlAngle'))).toEqual([6, 6, 6, 6]);
  });

  it('defines a borderless double-chevron light sweep with dark-mode and reduced-motion fallbacks', () => {
    const filePath = path.join(process.cwd(), 'src/views/home/cpns/features/FeatureSectionAnchor.vue');
    const source = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

    expect(source.match(/feature-section-anchor__chevron/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('feature-section-anchor__body');
    expect(source).not.toContain('outline: 3px solid');
    expect(source).toContain('feature-section-anchor-sweep');
    expect(source).toContain('animation-iteration-count: infinite');
    expect(source).toContain(':where(html.dark) &');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
