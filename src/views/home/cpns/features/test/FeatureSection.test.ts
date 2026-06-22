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
  },
  template: '<article class="feature-card-stub"><slot /></article>',
});

const DemoStub = defineComponent({
  template: '<div class="demo-stub" />',
});

describe('FeatureSection', () => {
  it('uses the animated downward arrow as the features anchor', () => {
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
    expect(wrapper.text()).not.toContain('How to Play');
    expect(wrapper.find('.feature-section__intro').exists()).toBe(false);
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
