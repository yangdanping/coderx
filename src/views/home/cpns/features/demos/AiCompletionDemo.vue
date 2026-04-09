<template>
  <div class="completion-demo">
    <div class="completion-demo__editor">
      <div class="completion-demo__toolbar">
        <span class="completion-demo__dot is-red"></span>
        <span class="completion-demo__dot is-yellow"></span>
        <span class="completion-demo__dot is-green"></span>
      </div>

      <pre class="completion-demo__content">{{ currentText }}<span class="completion-demo__cursor"></span></pre>
    </div>

    <div v-if="popupState !== 'hidden'" class="completion-demo__popover">
      <div v-if="popupState === 'loading'" class="completion-demo__loading">
        <ThinkingShimmer text="Thinking..." color="#8f959e" shimmer-color="#ffffff" />
      </div>

      <template v-else>
        <button
          v-for="(suggestion, index) in demoData.suggestions"
          :key="`${index}-${suggestion.text}`"
          type="button"
          class="completion-demo__suggestion"
          :class="{ active: activeIndex === index }"
        >
          <span class="completion-demo__shortcut">{{ index + 1 }}</span>
          <span>{{ suggestion.text }}</span>
        </button>

        <div class="completion-demo__hint">
          <span><kbd>Tab</kbd> 接受</span>
          <span><kbd>↑↓</kbd> 切换</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import ThinkingShimmer from '@/components/icon/cpns/ThinkingShimmer.vue';
import { useAutoPlay } from '@/composables/useAutoPlay';
import aiCompletionDemoData from '@/views/home/data/ai-completion-demo.json';

interface CompletionSuggestion {
  text: string;
}

interface AiCompletionDemoData {
  initialText: string;
  typingText: string;
  loadingDelay: number;
  highlightDelay: number;
  loopDelay: number;
  suggestions: CompletionSuggestion[];
  selectedIndex: number;
}

const props = defineProps<{
  active: boolean;
}>();

const demoData = aiCompletionDemoData as AiCompletionDemoData;
const currentText = ref(demoData.initialText);
const popupState = ref<'hidden' | 'loading' | 'showing'>('hidden');
const activeIndex = ref(0);
const hasStarted = ref(false);

const { start } = useAutoPlay({
  loopDelay: demoData.loopDelay,
});

const resetDemo = () => {
  currentText.value = demoData.initialText;
  popupState.value = 'hidden';
  activeIndex.value = 0;
};

watch(
  () => props.active,
  (active) => {
    if (!active || hasStarted.value) {
      return;
    }

    hasStarted.value = true;
    start(async ({ sleep }) => {
      resetDemo();

      for (const char of demoData.typingText) {
        currentText.value += char;
        const keepGoing = await sleep(36);
        if (!keepGoing) {
          return;
        }
      }

      popupState.value = 'loading';
      const waited = await sleep(demoData.loadingDelay);
      if (!waited) {
        return;
      }

      popupState.value = 'showing';

      for (let index = 0; index < demoData.suggestions.length; index += 1) {
        activeIndex.value = index;
        const keepGoing = await sleep(demoData.highlightDelay);
        if (!keepGoing) {
          return;
        }
      }

      activeIndex.value = demoData.selectedIndex;
      const selectedSuggestion = demoData.suggestions[demoData.selectedIndex];
      if (!selectedSuggestion) {
        return;
      }

      currentText.value += `\n${selectedSuggestion.text}`;
      const keepGoing = await sleep(900);
      if (!keepGoing) {
        return;
      }

      popupState.value = 'hidden';
    });
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.completion-demo {
  position: relative;
  /* 设置固定高度，保留底部留白 */
  height: 380px;
  padding-top: 10px;

  &__editor {
    height: 100%;
    padding: 14px 16px 18px;
    @include glass-effect;
    border: 1px solid #94b8ee;
    overflow: hidden;

    :where(html.dark) & {
      border-color: rgba(148, 184, 238, 0.4);
    }
  }

  &__toolbar {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;

    &.is-red {
      background: #ff5f57;
    }

    &.is-yellow {
      background: #ffbd2f;
    }

    &.is-green {
      background: #28c840;
    }
  }

  &__content {
    margin: 0;
    white-space: pre-wrap;
    font-family: 'Maple Mono', 'SFMono-Regular', monospace;
    font-size: 14px;
    line-height: 1.8;
    color: var(--text-primary);
  }

  &__cursor {
    display: inline-block;
    width: 9px;
    height: 1.1em;
    margin-left: 2px;
    vertical-align: text-bottom;
    background: var(--el-color-primary);
    animation: blink 1s steps(1) infinite;
  }

  &__popover {
    position: absolute;
    left: 34px;
    bottom: 24px;
    width: min(360px, calc(100% - 56px));
    @include glass-effect-popup;
    border: 1px solid #94b8ee;
    box-shadow: 4px 4px 0 rgba(148, 184, 238, 0.2);
    overflow: hidden;
    z-index: 2;

    :where(html.dark) & {
      border-color: rgba(148, 184, 238, 0.4);
      box-shadow: 4px 4px 0 rgba(148, 184, 238, 0.1);
    }
  }

  &__loading {
    padding: 12px 14px;
  }

  &__suggestion {
    width: 100%;
    border: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    text-align: left;
    background: transparent;
    color: var(--text-primary);
    transition: background-color 0.2s ease;

    &.active {
      background: #94b8ee;
      color: #ffffff;
    }
  }

  &__shortcut {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    font-size: 11px;
    color: #314155;
    background: rgba(220, 233, 222, 0.92);
  }

  &__hint {
    display: flex;
    gap: 12px;
    padding: 10px 14px;
    font-size: 12px;
    color: var(--text-secondary);
    border-top: 1px solid #94b8ee;

    :where(html.dark) & {
      border-top-color: rgba(148, 184, 238, 0.4);
    }
  }

  kbd {
    padding: 2px 5px;
    font-size: 11px;
    background: #f0f5ff;
    border: 1px solid #94b8ee;

    :where(html.dark) & {
      background: #1e293b;
      border-color: rgba(148, 184, 238, 0.4);
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
