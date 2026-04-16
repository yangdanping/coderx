<template>
  <div class="article-demo">
    <!-- `@scroll.passive` 是 Vue 的事件修饰符语法。
         它最终对应浏览器 `addEventListener(..., { passive: true })`：
         告诉浏览器“这个滚动监听里不会调用 preventDefault()”，
         这样浏览器就不用等待 JS 执行完再决定是否滚动，滚动会更顺滑。
         因此它适合 scroll / touch 这类高频事件，也不要和 `.prevent` 一起用。 -->
    <div ref="viewportRef" class="article-demo__viewport" @scroll.passive="handleViewportScroll">
      <div class="article-demo__inner">
        <p class="article-demo__kicker">{{ demoData.title }}</p>
        <p class="article-demo__intro">{{ demoData.intro }}</p>

        <section v-for="section in demoData.sections" :key="section.id" class="article-demo__section" :data-section-id="section.id">
          <h4 class="article-demo__heading">{{ section.heading }}</h4>
          <p v-for="paragraph in section.paragraphs" :key="paragraph" class="article-demo__paragraph">
            {{ paragraph }}
          </p>
          <img v-if="section.image" class="article-demo__image" :src="section.image.src" :alt="section.image.alt" />
          <pre v-if="section.code" class="article-demo__code"><CopyButton :text="section.code" /><code class="language-typescript">{{ section.code }}</code></pre>
        </section>
      </div>
    </div>

    <aside class="article-demo__toc">
      <div class="article-demo__toc-title">目录</div>
      <button
        v-for="section in demoData.sections"
        :key="section.id"
        type="button"
        :class="['article-demo__toc-item', `level-${section.level}`, { active: activeId === section.id }]"
        @click="jumpToSection(section.id, true)"
      >
        {{ section.heading }}
      </button>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';

import articleTocDemoData from '@/views/home/data/article-toc-demo.json';
import { useAutoPlay } from '@/composables/useAutoPlay';
import codeHeightlight from '@/utils/codeHeightlight';
import { CopyButton } from '@/views/detail/cpns/detail/CopyButton';

import type { ArticleTocDemoData } from './types/article-toc-demo.type';

const props = defineProps<{
  active: boolean;
}>();

const demoData = articleTocDemoData as ArticleTocDemoData;
const viewportRef = ref<HTMLDivElement | null>(null);
const activeId = ref(demoData.sections[0]?.id ?? '');
const manualPaused = ref(false);
const hasStarted = ref(false);
const isProgrammaticScroll = ref(false);

const { start } = useAutoPlay({ loopDelay: 2400 });

let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let scrollFlagTimer: ReturnType<typeof setTimeout> | null = null;

// 这段不是“卡片进入视口后激活”的核心逻辑。
// 它负责的是：当卡片内部这个可滚动区域上下滚动时，
// 找出当前最接近顶部的内容 section，并同步更新右侧目录高亮。
// 真正控制“卡片进入页面视口后再启动演示”的逻辑在 `FeatureCard.vue`
// 里，通过 `IntersectionObserver` 监听卡片是否出现在视口中。
const updateActiveFromScroll = () => {
  const viewport = viewportRef.value;
  if (!viewport) {
    return;
  }

  // 收集当前 demo 里所有可参与目录定位的 section。
  const sections = Array.from(viewport.querySelectorAll<HTMLElement>('[data-section-id]'));
  let currentSection = sections[0];

  // 遍历每个 section：
  // 只要它的顶部已经滚到“距离容器顶部 60px 以内”，
  // 就把它视为当前阅读到的 section。
  // 这样滚动过程中，currentSection 会不断指向“当前最靠上且已进入阅读区”的那一块。
  for (const section of sections) {
    if (section.offsetTop - viewport.scrollTop <= 60) {
      currentSection = section;
    }
  }

  // 读取 section 上的 `data-section-id`，再用它驱动右侧目录按钮的高亮状态。
  if (currentSection?.dataset.sectionId) {
    activeId.value = currentSection.dataset.sectionId;
  }
};

const markManualPause = () => {
  manualPaused.value = true;
  if (resumeTimer) {
    clearTimeout(resumeTimer);
  }

  resumeTimer = setTimeout(() => {
    manualPaused.value = false;
  }, 2200);
};

const jumpToSection = (id: string, byUser = false) => {
  const viewport = viewportRef.value;
  if (!viewport) {
    return;
  }

  const target = viewport.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
  if (!target) {
    return;
  }

  activeId.value = id;
  isProgrammaticScroll.value = true;
  if (scrollFlagTimer) {
    clearTimeout(scrollFlagTimer);
  }

  viewport.scrollTo({
    top: Math.max(target.offsetTop - 18, 0),
    behavior: 'smooth',
  });

  if (byUser) {
    markManualPause();
  }
};

const resetDemo = () => {
  const viewport = viewportRef.value;
  if (viewport) {
    viewport.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }
  activeId.value = demoData.sections[0]?.id ?? '';
};

const handleViewportScroll = () => {
  updateActiveFromScroll();

  if (isProgrammaticScroll.value) {
    if (scrollFlagTimer) {
      clearTimeout(scrollFlagTimer);
    }

    scrollFlagTimer = setTimeout(() => {
      isProgrammaticScroll.value = false;
    }, 160);
    return;
  }

  markManualPause();
};

watch(
  () => props.active,
  (active) => {
    if (!active || hasStarted.value) {
      return;
    }

    hasStarted.value = true;
    start(async ({ sleep, isStopped }) => {
      resetDemo();
      await sleep(500);

      for (const section of demoData.sections) {
        while (manualPaused.value && !isStopped()) {
          const keepWaiting = await sleep(200);
          if (!keepWaiting) {
            return;
          }
        }

        jumpToSection(section.id);
        const keepGoing = await sleep(1800);
        if (!keepGoing) {
          return;
        }
      }
    });
  },
  { immediate: true },
);

onMounted(() => {
  if (viewportRef.value) {
    codeHeightlight(viewportRef.value);
  }
});
const clearTimers = () => {
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }

  if (scrollFlagTimer) {
    clearTimeout(scrollFlagTimer);
    scrollFlagTimer = null;
  }
};

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<style scoped lang="scss">
.article-demo {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(120px, 0.8fr);
  gap: 18px;
  height: 100%;

  &__viewport {
    position: relative;
    /* 设置固定高度，保留底部留白 */
    height: 380px;
    padding: 0 10px 0 0;
    overflow-y: auto;
    mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 92%, transparent 100%);
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none;
  }

  &__inner {
    padding-right: 8px;
    padding-top: 32px;
    padding-bottom: 32px;
  }

  &__kicker {
    margin: 0 0 8px;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  &__intro {
    margin: 0 0 18px;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  &__section {
    padding: 18px 0 24px;
  }

  &__heading {
    margin: 0 0 14px;
    font-size: 22px;
    color: var(--text-primary);
  }

  &__paragraph {
    margin: 0 0 12px;
    line-height: 1.8;
    color: var(--text-regular);
  }

  &__image {
    display: block;
    width: 100%;
    margin-top: 14px;
    object-fit: cover;
    aspect-ratio: 16 / 9;
  }

  &__code {
    margin: 16px 0 0;
    padding: 14px 16px;
    overflow-x: auto;
    background: #1e1f29;
    color: #d7e4ff;
    font-size: 13px;
    line-height: 1.6;
    position: relative;

    &:hover :deep(.code-copy-btn) {
      display: flex;
    }

    :deep(.code-copy-btn) {
      display: none;
      position: absolute;
      top: 8px;
      right: 8px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background-color: #3b4048;
      border: 1px solid #4b5263;
      border-radius: 4px;
      padding: 4px;
      transition: all 0.3s;
      z-index: 10;
      width: 28px;
      height: 28px;

      &:hover {
        background-color: #4b5263;
      }
    }
  }

  &__toc {
    align-self: start;
    padding: 20px;
    @include glass-effect;
    border: 1px solid var(--el-border-color-lighter);
    transition: all 0.3s ease;
  }

  &__toc-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    color: var(--text-primary);
  }

  &__toc-item {
    display: block;
    width: 100%;
    border: 0;
    background: transparent;
    padding: 8px 10px;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.4;
    color: var(--text-secondary);
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      color: var(--el-color-primary);
    }

    &.active {
      color: var(--el-color-primary);
      font-weight: bold;
      background-color: var(--el-color-primary-light-9);
    }

    &.level-1 {
      font-weight: 600;
    }

    &.level-2 {
      padding-left: 20px;
      font-size: 13px;
    }
  }
}

@media (max-width: 768px) {
  .article-demo {
    grid-template-columns: 1fr;

    &__toc {
      display: none;
    }

    &__viewport {
      min-height: 260px;
    }
  }
}
</style>
