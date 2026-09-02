import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getRandomTocArticleMock, routerPushMock, showFailMock } = vi.hoisted(() => ({
  getRandomTocArticleMock: vi.fn(),
  routerPushMock: vi.fn(),
  showFailMock: vi.fn(),
}));

vi.mock('@/service/article/article.request', () => ({
  getRandomTocArticle: getRandomTocArticleMock,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/utils/Msg', () => ({
  default: {
    showFail: showFailMock,
  },
}));

import FeatureSection from '../FeatureSection.vue';
import featuresData from '@/views/home/data/features.json';

const DemoStub = defineComponent({
  name: 'DemoStub',
  props: { active: Boolean },
  template: '<div class="demo-stub" :data-active="active" />',
});

describe('FeatureSection scroll story', () => {
  beforeEach(() => {
    getRandomTocArticleMock.mockReset();
    routerPushMock.mockReset();
    showFailMock.mockReset();
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

  function mountSection() {
    return mount(FeatureSection, {
      global: {
        stubs: {
          ArticleTocDemo: DemoStub,
          AiChatDemo: DemoStub,
          AiCompletionDemo: DemoStub,
          MarkdownRenderDemo: DemoStub,
        },
      },
    });
  }

  it('maps reading, chat, and writing features to their contextual CTA labels', () => {
    expect(featuresData.map((feature) => feature.action)).toEqual([
      { kind: 'random-toc', label: 'Go check' },
      { kind: 'random-toc', label: 'Go chat' },
      { kind: 'edit', label: 'Go edit' },
      { kind: 'edit', label: 'Go edit' },
    ]);
  });

  it('renders one stable demo stage beside four semantic narrative steps', () => {
    const wrapper = mountSection();

    expect(wrapper.findAll('.feature-demo-stage')).toHaveLength(1);
    expect(wrapper.findAll('article.feature-narrative')).toHaveLength(4);
    expect(wrapper.findAll('.feature-narrative__action').map((button) => button.get('span').text())).toEqual(['Go check', 'Go chat', 'Go edit', 'Go edit']);
    expect(wrapper.findAll('.feature-narrative__title').map((title) => title.text())).toEqual(featuresData.map((feature) => feature.title));
    expect(wrapper.get('.feature-demo-stage').attributes('aria-live')).toBe('polite');
  });

  it('keeps the feature anchor and identifies the requested and rendered states separately', () => {
    const wrapper = mountSection();
    const anchor = wrapper.get('a#features');

    expect(anchor.attributes('href')).toBe('#features');
    expect(anchor.attributes('aria-label')).toBe('进入核心特性');
    expect(wrapper.get('.feature-story').attributes('data-requested-feature')).toBe('article-toc');
    expect(wrapper.get('.feature-story').attributes('data-rendered-feature')).toBe('article-toc');
    expect(wrapper.get('.feature-demo-stage').classes()).toContain('is-idle');
  });

  it('defines a scroll-linked entrance, sticky visual rail, and non-sticky mobile fallback', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/features/FeatureSection.vue'), 'utf8');

    expect(source).toContain('--feature-intro-progress');
    expect(source).toContain('position: sticky');
    expect(source).toContain('translate3d');
    expect(source).toContain('@media (max-width: 900px)');
    expect(source).toMatch(/@media \(max-width: 900px\)[\s\S]*?position:\s*static/);
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).not.toContain("import FeatureCard from './FeatureCard.vue'");
  });

  it('scopes the light-mode ambient dimming and eye-white palette to the feature story', () => {
    const readSource = (filePath: string) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
    const homeSource = readSource('src/views/home/Home.vue');
    const navbarSource = readSource('src/components/navbar/NavBar.vue');
    const commonSource = readSource('src/assets/css/common.scss');
    const stageSource = readSource('src/views/home/cpns/features/FeatureDemoStage.vue');
    const featurePaintSources = [
      readSource('src/views/home/cpns/features/FeatureSectionAnchor.vue'),
      readSource('src/views/home/cpns/features/demos/AiChatDemo.vue'),
      readSource('src/views/home/cpns/features/demos/AiCompletionDemo.vue'),
    ].join('\n');

    expect(homeSource).toContain('useFeatureAmbientDimming');
    expect(homeSource).toContain('ref="featureZone"');
    expect(homeSource).toContain('--feature-ambient-progress');
    expect(homeSource).toContain('--home-feature-ambient-progress');
    expect(homeSource).toContain('rgb(0 0 0 / calc(var(--feature-ambient-progress) * 0.76))');
    expect(homeSource).not.toContain('background: #101216');
    expect(homeSource).not.toContain('opacity: calc(var(--feature-ambient-progress) * 0.94)');
    expect(homeSource).toContain('--feature-ambient-surface-weight: clamp(0%, calc(var(--feature-ambient-progress) * 240%), 100%)');
    expect(homeSource).toContain('--text-primary: var(--eye-white)');
    expect(homeSource).toContain('html:not(.dark)');
    expect(homeSource).toContain('color-mix');
    expect(homeSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(navbarSource).toContain('--home-feature-ambient-progress');
    expect(navbarSource).toContain('--navbar-ambient-weight: clamp(0%, calc(var(--navbar-ambient-progress) * 250%), 100%)');
    expect(navbarSource).toContain('--navbar-ambient-surface');
    expect(navbarSource).toContain('rgb(0 0 0 / 0.76)');
    expect(navbarSource).toContain('var(--eye-white)');
    expect(navbarSource).toContain('html:not(.dark)');
    expect(commonSource).toContain('--eye-white: #ededed');
    expect(commonSource).toContain('--text-primary: var(--eye-white)');
    expect(commonSource).not.toMatch(/color:\s*#fff(?:fff)?\b/i);
    expect(featurePaintSources).toContain('var(--eye-white)');
    expect(featurePaintSources).toContain('var(--feature-demo-blue-surface');
    expect(stageSource).toContain('var(--feature-stage-shadow-color');
    expect(featurePaintSources).not.toMatch(/(?:color|shimmer-color|stop-color)\s*(?::|=)\s*["']?(?:#fff(?:fff)?|white)\b/i);
    expect(featurePaintSources).not.toContain('rgb(255 255 255');
  });

  it('uses independent time-based keyframes for demo exit and entrance', () => {
    const filePath = path.join(process.cwd(), 'src/views/home/cpns/features/FeatureDemoStage.vue');
    const source = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

    expect(source).toContain('feature-demo-leave');
    expect(source).toContain('180ms');
    expect(source).toContain('feature-demo-enter');
    expect(source).toContain('320ms');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('removes the legacy independent-card implementation from the home feature section', () => {
    const legacyCardPath = path.join(process.cwd(), 'src/views/home/cpns/features/FeatureCard.vue');
    const legacyCardTestPath = path.join(process.cwd(), 'src/views/home/cpns/features/test/FeatureCard.test.ts');
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');

    expect(fs.existsSync(legacyCardPath)).toBe(false);
    expect(fs.existsSync(legacyCardTestPath)).toBe(false);
    expect(homeSource).toContain('<FeatureSection />');
    expect(homeSource).not.toContain('<FeatureSection :columns="1" />');
  });

  it('loads a random TOC article once and routes to its detail page', async () => {
    let resolveRequest!: (value: { code: number; data: { id: number } }) => void;
    getRandomTocArticleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const wrapper = mountSection();
    const button = wrapper.findAll<HTMLButtonElement>('.feature-narrative__action')[0]!;

    await button.trigger('click');

    expect(getRandomTocArticleMock).toHaveBeenCalledTimes(1);
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toContain('Loading…');

    await button.trigger('click');
    expect(getRandomTocArticleMock).toHaveBeenCalledTimes(1);

    resolveRequest({ code: 0, data: { id: 77 } });
    await flushPromises();

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'detail', params: { articleId: 77 } });
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('routes editor-oriented features through the existing protected edit route', async () => {
    const wrapper = mountSection();
    const button = wrapper.findAll('.feature-narrative__action')[2]!;

    await button.trigger('click');

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'edit' });
    expect(getRandomTocArticleMock).not.toHaveBeenCalled();
  });

  it('keeps the latest edit navigation when an older random lookup resolves later', async () => {
    let resolveRequest!: (value: { code: number; data: { id: number } }) => void;
    getRandomTocArticleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const wrapper = mountSection();
    const buttons = wrapper.findAll<HTMLButtonElement>('.feature-narrative__action');

    await buttons[0]!.trigger('click');
    await buttons[2]!.trigger('click');

    expect(routerPushMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenLastCalledWith({ name: 'edit' });
    expect(buttons[0]!.attributes('disabled')).toBeUndefined();

    resolveRequest({ code: 0, data: { id: 88 } });
    await flushPromises();

    expect(routerPushMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenLastCalledWith({ name: 'edit' });
  });

  it('does not navigate when a random lookup resolves after the feature section unmounts', async () => {
    let resolveRequest!: (value: { code: number; data: { id: number } }) => void;
    getRandomTocArticleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const wrapper = mountSection();

    await wrapper.findAll('.feature-narrative__action')[0]!.trigger('click');
    wrapper.unmount();
    resolveRequest({ code: 0, data: { id: 99 } });
    await flushPromises();

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(showFailMock).not.toHaveBeenCalled();
  });

  it('keeps the user on home and shows a readable error when random lookup fails', async () => {
    getRandomTocArticleMock.mockRejectedValue(new Error('network down'));
    const wrapper = mountSection();

    await wrapper.findAll('.feature-narrative__action')[0]!.trigger('click');
    await flushPromises();

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(showFailMock).toHaveBeenCalledWith('暂时没有可体验目录的文章，请稍后再试');
  });
});
