<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

import FeatureDemoStage from './FeatureDemoStage.vue';
import FeatureNarrativeStep from './FeatureNarrativeStep.vue';
import FeatureSectionAnchor from './FeatureSectionAnchor.vue';
import AiChatDemo from './demos/AiChatDemo.vue';
import AiCompletionDemo from './demos/AiCompletionDemo.vue';
import ArticleTocDemo from './demos/ArticleTocDemo.vue';
import MarkdownRenderDemo from './demos/MarkdownRenderDemo.vue';
import { useFeatureStoryMotion } from './composables/useFeatureStoryMotion';

import featuresData from '@/views/home/data/features.json';
import { getRandomTocArticle } from '@/service/article/article.request';
import Msg from '@/utils/Msg';

import type { Component, ComponentPublicInstance } from 'vue';
import type { FeatureMeta } from './types/feature-section.type';

interface FeatureCard extends FeatureMeta {
  component: Component;
}

const demoComponentMap: Record<string, Component> = {
  'article-toc': ArticleTocDemo,
  'ai-summary': AiChatDemo,
  'ai-completion': AiCompletionDemo,
  'markdown-render': MarkdownRenderDemo,
};

const featureCards = (featuresData as FeatureMeta[]).reduce<FeatureCard[]>((cards, feature) => {
  const component = demoComponentMap[feature.id];
  if (!component) {
    console.warn(`[FeatureSection] Missing demo component for feature id "${feature.id}".`);
    return cards;
  }
  cards.push({ ...feature, component });
  return cards;
}, []);

const storyRoot = useTemplateRef<HTMLElement>('featureStory');
const router = useRouter();
const actionLoadingId = shallowRef<string | null>(null);
let featureActionGeneration = 0;

onBeforeUnmount(() => {
  featureActionGeneration += 1;
  actionLoadingId.value = null;
});
const { introProgress, requestedIndex, renderedIndex, phase, setStepRef } = useFeatureStoryMotion({
  rootRef: storyRoot,
  featureCount: featureCards.length,
});

const renderedFeature = computed(() => featureCards[renderedIndex.value] ?? featureCards[0]!);
const requestedFeature = computed(() => featureCards[requestedIndex.value] ?? featureCards[0]!);
const storyStyle = computed(() => ({
  '--feature-intro-progress': introProgress.value.toFixed(4),
}));
const positionLabel = computed(() => `${String(renderedIndex.value + 1).padStart(2, '0')} / ${String(featureCards.length).padStart(2, '0')}`);

const registerNarrativeStep = (index: number, element: Element | ComponentPublicInstance | null) => {
  setStepRef(index, element instanceof HTMLElement ? element : null);
};

const randomArticleFallbackMessage = '暂时没有可体验目录的文章，请稍后再试';

const getRequestErrorMessage = (error: unknown) => {
  const responseMessage = (error as { response?: { data?: { msg?: unknown } } })?.response?.data?.msg;
  return typeof responseMessage === 'string' && responseMessage.trim() ? responseMessage : randomArticleFallbackMessage;
};

const handleFeatureAction = async (feature: FeatureMeta) => {
  if (feature.action.kind === 'edit') {
    featureActionGeneration += 1;
    actionLoadingId.value = null;
    await router.push({ name: 'edit' });
    return;
  }

  if (actionLoadingId.value) return;
  const actionGeneration = ++featureActionGeneration;
  actionLoadingId.value = feature.id;

  try {
    const response = await getRandomTocArticle();
    if (actionGeneration !== featureActionGeneration) return;

    const articleId = Number(response.data?.id);
    if (response.code !== 0 || !Number.isSafeInteger(articleId) || articleId <= 0) {
      Msg.showFail(response.msg?.trim() || randomArticleFallbackMessage);
      return;
    }
    await router.push({ name: 'detail', params: { articleId } });
  } catch (error: unknown) {
    if (actionGeneration !== featureActionGeneration) return;
    Msg.showFail(getRequestErrorMessage(error));
  } finally {
    if (actionGeneration === featureActionGeneration) {
      actionLoadingId.value = null;
    }
  }
};
</script>

<template>
  <section
    ref="featureStory"
    class="feature-story"
    :style="storyStyle"
    :data-requested-feature="requestedFeature.id"
    :data-rendered-feature="renderedFeature.id"
  >
    <FeatureSectionAnchor class="feature-story__anchor" />

    <header class="feature-story__mobile-heading">
      <h1 class="feature-story__mobile-title">How to Play</h1>
      <p class="feature-story__mobile-intro">快速感受社区的核心交互</p>
    </header>

    <div class="feature-story__layout">
      <div class="feature-story__visual-rail">
        <FeatureDemoStage
          :feature-id="renderedFeature.id"
          :feature-title="renderedFeature.title"
          :position-label="positionLabel"
          :demo-component="renderedFeature.component"
          :phase="phase"
          :active="phase !== 'leaving'"
        />
      </div>

      <div class="feature-story__narratives">
        <div
          v-for="(feature, index) in featureCards"
          :key="feature.id"
          :ref="(element) => registerNarrativeStep(index, element)"
          class="feature-story__narrative-step"
        >
          <FeatureNarrativeStep
            :feature="feature"
            :demo-component="feature.component"
            :index="index"
            :total="featureCards.length"
            :active="requestedIndex === index"
            :loading="actionLoadingId === feature.id"
            @feature-action="handleFeatureAction"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.feature-story {
  --feature-intro-progress: 0;
  --feature-stage-shift: calc((1 - var(--feature-intro-progress)) * 39%);

  position: relative;
  margin: clamp(42px, 7vw, 104px) 0 clamp(80px, 10vw, 150px);

  &__anchor {
    margin-bottom: clamp(44px, 8vh, 92px);
  }

  &__mobile-heading {
    display: none;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.16fr) minmax(300px, 0.84fr);
    gap: clamp(48px, 7vw, 120px);
    align-items: start;
  }

  &__visual-rail {
    position: sticky;
    z-index: var(--z-sticky);
    top: calc(var(--navbarHeight) + clamp(24px, 5vh, 64px));
    height: clamp(460px, calc(100vh - var(--navbarHeight) - 12vh), 680px);
    transform: translate3d(var(--feature-stage-shift), 0, 0);
    will-change: transform;
  }

  &__narratives {
    margin-top: clamp(280px, 46vh, 480px);
    padding-bottom: 14vh;
  }

  &__narrative-step {
    display: flex;
    align-items: center;
    min-height: 86vh;
    scroll-margin-top: calc(var(--navbarHeight) + 16vh);
  }
}

@media (max-width: 1100px) {
  .feature-story {
    &__layout {
      grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
      gap: 44px;
    }

    &__visual-rail {
      height: clamp(440px, 66vh, 580px);
    }
  }
}

@media (max-width: 900px) {
  .feature-story {
    --feature-stage-shift: 0px;

    margin: 52px 0 92px;

    &__anchor {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: 0;
      overflow: hidden;
      clip-path: inset(50%);
      opacity: 0;
      pointer-events: none;
    }

    &__mobile-heading {
      display: block;
      margin-bottom: 44px;
    }

    &__mobile-title {
      margin: 0;
      color: var(--text-primary);
      font-family: 'GeistPixel-Line', sans-serif;
      font-size: clamp(36px, 10vw, 54px);
      font-weight: 500;
    }

    &__mobile-intro {
      margin: 14px 0 0;
      color: var(--text-secondary);
      font-size: 17px;
      line-height: 1.7;
    }

    &__layout {
      display: block;
    }

    &__visual-rail {
      display: none;
      position: static;
      height: auto;
      transform: none;
    }

    &__narratives {
      margin: 0;
      padding: 0;
    }

    &__narrative-step {
      display: block;
      min-height: 0;
      margin-bottom: clamp(76px, 18vw, 120px);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-story {
    --feature-stage-shift: 0px;

    &__visual-rail {
      transform: none;
      will-change: auto;
    }
  }
}
</style>
