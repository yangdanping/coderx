<template>
  <div class="markdown-demo">
    <div class="markdown-demo__panel">
      <div class="markdown-demo__label">Markdown</div>
      <pre class="markdown-demo__source">{{ sourceText }}</pre>
    </div>

    <div class="markdown-demo__panel">
      <div class="markdown-demo__label">Preview</div>
      <div class="markdown-demo__preview editor-content-view" v-dompurify-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it';
import { computed, ref, watch } from 'vue';

import { useAutoPlay } from '@/composables/useAutoPlay';
import markdownDemoData from '@/views/home/data/markdown-demo.json';

import type { MarkdownDemoData } from './types/markdown-render-demo.type';

const props = defineProps<{
  active: boolean;
}>();

const demoData = markdownDemoData as MarkdownDemoData;
const sourceText = ref('');
const hasStarted = ref(false);
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const { start } = useAutoPlay({
  loopDelay: demoData.loopDelay,
});

const renderedContent = computed(() => md.render(sourceText.value || ''));

watch(
  () => props.active,
  (active) => {
    if (!active || hasStarted.value) {
      return;
    }

    hasStarted.value = true;
    start(async ({ sleep }) => {
      sourceText.value = '';

      for (let lineIndex = 0; lineIndex < demoData.lines.length; lineIndex += 1) {
        const line = demoData.lines[lineIndex] ?? '';

        for (const char of line) {
          sourceText.value += char;
          const keepGoing = await sleep(demoData.typingSpeed);
          if (!keepGoing) {
            return;
          }
        }

        if (lineIndex < demoData.lines.length - 1) {
          sourceText.value += '\n';
          const keepGoing = await sleep(Math.max(80, demoData.typingSpeed));
          if (!keepGoing) {
            return;
          }
        }
      }
    });
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.markdown-demo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  /* 设置固定高度，保留底部留白 */
  height: 380px;

  &__panel {
    height: 100%;
    padding: 14px 16px;
    @include glass-effect;
    border: 1px solid #94b8ee;
    overflow: hidden;

    :where(html.dark) & {
      border-color: rgba(148, 184, 238, 0.4);
    }
  }

  &__label {
    margin-bottom: 12px;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  &__source {
    margin: 0;
    height: calc(100% - 24px);
    overflow: auto;
    white-space: pre-wrap;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-primary);
  }

  &__preview {
    height: calc(100% - 24px);
    overflow: auto;
    padding-right: 6px;
  }

  &__preview:deep(h1),
  &__preview:deep(h2),
  &__preview:deep(p),
  &__preview:deep(ul),
  &__preview:deep(blockquote),
  &__preview:deep(pre) {
    margin-top: 0;
  }

  &__preview:deep(pre) {
    padding: 12px 14px;
    background: #1e1f29;
    color: #d7e4ff;
    overflow-x: auto;
  }

  &__preview:deep(code) {
    font-family: 'SFMono-Regular', Consolas, monospace;
  }
}

@media (max-width: 768px) {
  .markdown-demo {
    grid-template-columns: 1fr;
    height: auto;

    &__panel {
      height: 320px;
    }
  }
}
</style>
