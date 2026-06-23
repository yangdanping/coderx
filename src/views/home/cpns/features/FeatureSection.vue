<template>
  <section class="feature-section">
    <FeatureSectionAnchor class="feature-section__desktop-anchor" />

    <div class="feature-section__mobile-heading">
      <h1 class="feature-section__mobile-title">How to Play</h1>
      <p class="feature-section__intro">快速感受社区的核心交互</p>
    </div>

    <div class="feature-section__grid" :class="[`is-${columns}-col`]">
      <FeatureCard
        v-for="(feature, index) in featureCards"
        :key="feature.id"
        :index="index + 1"
        :title="feature.title"
        :description="feature.description"
        :delay="index * 120"
        :note-side="index % 2 === 0 ? 'left' : 'right'"
        :note-curl-angle="props.noteCurlAngle"
        @activate="handleActivate(feature.id)"
      >
        <component :is="feature.component" :active="Boolean(activatedCards[feature.id])" />
      </FeatureCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

import FeatureCard from './FeatureCard.vue';
import FeatureSectionAnchor from './FeatureSectionAnchor.vue';
import ArticleTocDemo from './demos/ArticleTocDemo.vue';
import AiChatDemo from './demos/AiChatDemo.vue';
import AiCompletionDemo from './demos/AiCompletionDemo.vue';
import MarkdownRenderDemo from './demos/MarkdownRenderDemo.vue';

import featuresData from '@/views/home/data/features.json';

import type { FeatureMeta } from './types/feature-section.type';

const props = withDefaults(
  defineProps<{
    columns?: 1 | 2;
    /** 便签外侧下缘的翘曲角度（单位：deg），默认 4，建议设置在 0–8 之间。 */
    noteCurlAngle?: number;
  }>(),
  {
    columns: 1,
    noteCurlAngle: 4,
  },
);

const demoComponentMap = {
  'article-toc': ArticleTocDemo,
  'ai-summary': AiChatDemo,
  'ai-completion': AiCompletionDemo,
  'markdown-render': MarkdownRenderDemo,
} as const;

const activatedCards = reactive<Record<string, boolean>>({});

// 用reduce把 JSON 里的功能描述组装成真正可渲染的卡片数据(遍历 + 过滤 + 组装)
// 1. 遍历 `featuresData`
// 2. 按 `feature.id` 找到对应的演示组件
// 3. 只把能成功匹配组件的项推进 `cards`
// 最后得到的是一个“页面真正要渲染的卡片数组”。
const featureCards = (featuresData as FeatureMeta[]).reduce<Array<FeatureMeta & { component: (typeof demoComponentMap)[keyof typeof demoComponentMap] }>>((cards, feature) => {
  const component = demoComponentMap[feature.id as keyof typeof demoComponentMap];

  if (!component) {
    console.warn(`[FeatureSection] Missing demo component for feature id "${feature.id}".`);
    return cards;
  }

  cards.push({
    ...feature,
    component,
  });

  return cards;
}, []);

const handleActivate = (id: string) => {
  activatedCards[id] = true;
};
</script>

<style scoped lang="scss">
.feature-section {
  margin: 28px 0 80px;

  &__mobile-heading {
    display: none;
  }

  &__grid {
    display: grid;
    gap: 24px;

    &.is-1-col {
      grid-template-columns: 1fr;
      width: 60%; /* 当显示一行一个时，宽度占左右容器的60% (可在此处调整宽度) */
      margin: 0 auto;
    }

    &.is-2-col {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
    }
  }
}

@media (max-width: 1200px) {
  .feature-section {
    &__grid.is-1-col {
      width: 80%;
    }
  }
}

@media (max-width: 900px) {
  .feature-section {
    &__grid {
      &.is-1-col,
      &.is-2-col {
        grid-template-columns: 1fr;
        width: 100%;
      }
    }
  }
}

@media (max-width: 768px) {
  .feature-section {
    position: relative;
    margin: 40px 0 80px;

    &__desktop-anchor {
      position: absolute;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      margin: 0;
      overflow: hidden;
      clip-path: inset(50%);
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    }

    &__mobile-heading {
      display: block;
      margin-bottom: 24px;
    }

    &__mobile-title {
      margin: 0 0 20px;
      font-size: 32px;
      line-height: 1.2;
      color: var(--text-primary);
    }

    &__intro {
      max-width: 760px;
      margin: 0;
      font-size: 16px;
      line-height: 1.8;
      color: var(--text-secondary);
    }
  }
}
</style>
