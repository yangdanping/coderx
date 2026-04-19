<template>
  <section class="feature-section">
    <SectionTitle id="features">How to Play</SectionTitle>
    <p class="feature-section__intro">快速感受社区的核心交互</p>

    <div class="feature-section__grid" :class="[`is-${columns}-col`]">
      <FeatureCard
        v-for="(feature, index) in featureCards"
        :key="feature.id"
        :index="index + 1"
        :title="feature.title"
        :description="feature.description"
        :delay="index * 120"
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
import ArticleTocDemo from './demos/ArticleTocDemo.vue';
import AiChatDemo from './demos/AiChatDemo.vue';
import AiCompletionDemo from './demos/AiCompletionDemo.vue';
import MarkdownRenderDemo from './demos/MarkdownRenderDemo.vue';
import SectionTitle from '../SectionTitle.vue';

import featuresData from '@/views/home/data/features.json';

import type { FeatureMeta } from './types/feature-section.type';

const props = withDefaults(
  defineProps<{
    columns?: 1 | 2;
  }>(),
  {
    columns: 1,
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
  margin: 40px 0 80px;

  &__intro {
    max-width: 760px;
    margin: 0 0 24px;
    line-height: 1.8;
    color: var(--text-secondary);
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
</style>
