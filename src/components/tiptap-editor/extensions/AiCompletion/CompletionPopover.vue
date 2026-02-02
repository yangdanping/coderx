<template>
  <Teleport to="body">
    <Transition name="completion-fade">
      <div v-if="visible" class="completion-popover" :style="positionStyle" @mousedown.prevent>
        <!-- Loading 状态 -->
        <div v-if="state === 'loading'" class="completion-loading">
          <ThinkingShimmer :width="120" :height="20" :text="waitingTimeText" color="#909399" shimmerColor="#fff" />
        </div>

        <!-- 建议列表 -->
        <template v-else-if="state === 'showing' && suggestions.length > 0">
          <div
            v-for="(item, index) in suggestions"
            :key="item.id"
            class="completion-item"
            :class="{ active: activeIndex === index }"
            @click="handleSelect(index)"
            @mouseenter="handleHover(index)"
          >
            <span class="shortcut">{{ index + 1 }}</span>
            <span class="text">{{ item.text }}</span>
          </div>
          <div class="completion-hint">
            <span class="hint-item"><kbd>Tab</kbd> 接受</span>
            <span class="hint-item"><kbd>↑↓</kbd> 选择</span>
            <span class="hint-item"><kbd>Esc</kbd> 取消</span>
          </div>
        </template>

        <!-- 错误状态 -->
        <div v-else-if="state === 'error'" class="completion-error">
          <span>补全服务暂时不可用</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { CompletionSuggestion, CompletionState, PopoverPosition } from './types';

const props = defineProps<{
  state: CompletionState;
  suggestions: CompletionSuggestion[];
  position: PopoverPosition | null;
  activeIndex: number;
  editorRect: DOMRect | null;
}>();

const emit = defineEmits<{
  (e: 'select', index: number): void;
  (e: 'hover', index: number): void;
}>();

// 等待时间计时器
const elapsedSeconds = ref(0);
let timerInterval: ReturnType<typeof setInterval> | null = null;

// 监听 state 变化，控制计时器
watch(
  () => props.state,
  (newState, oldState) => {
    if (newState === 'loading' && oldState !== 'loading') {
      // 进入 loading 状态，开始计时
      elapsedSeconds.value = 0;
      timerInterval = setInterval(() => {
        elapsedSeconds.value++;
      }, 1000);
    } else if (newState !== 'loading' && oldState === 'loading') {
      // 离开 loading 状态，停止计时
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  },
);

// 格式化等待时间显示
const waitingTimeText = computed(() => {
  if (elapsedSeconds.value === 0) {
    return 'Thinking...';
  }
  return `Thinking... ${elapsedSeconds.value}s`;
});

// 组件卸载时清理
onBeforeUnmount(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

// 是否显示弹出框
const visible = computed(() => {
  return (props.state === 'loading' || props.state === 'showing' || props.state === 'error') && props.position !== null;
});

// 计算位置样式
const positionStyle = computed(() => {
  if (!props.position || !props.editorRect) {
    return { display: 'none' };
  }

  // 在光标下方显示，加 24px 垂直偏移避免遮挡光标
  return {
    top: `${props.editorRect.top + props.position.top + 80}px`,
    left: `${props.editorRect.left + props.position.left}px`,
  };
});

// 选择建议
const handleSelect = (index: number) => {
  emit('select', index);
};

// 悬停建议
const handleHover = (index: number) => {
  emit('hover', index);
};
</script>

<style lang="scss" scoped>
.completion-popover {
  position: fixed;
  z-index: 9999;
  min-width: 100px;
  max-width: 400px;
  @include glass-effect-popup;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  font-size: 13px;

  :where(html.dark) & {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    @include thin-border(all, #333);
  }
}

.completion-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  .loading-text {
    font-size: 12px;
  }
}

@keyframes dot-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.completion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
  color: var(--text-primary);

  &:hover,
  &.active {
    background-color: #ebf5f0;

    :where(html.dark) & {
      background-color: #2c3e34;
    }
  }

  .shortcut {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background-color: #dce9de;
    font-size: 11px;
    color: #303133;

    :where(html.dark) & {
      background-color: #2c3e34;
      color: #8feb87;
    }
  }

  .text {
    flex: 1;
    color: inherit;
    word-break: break-word;
  }
}

.completion-hint {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  @include thin-border(top, #eee);
  color: var(--text-secondary);

  :where(html.dark) & {
    @include thin-border(top, #333);
  }

  .hint-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  kbd {
    display: inline-block;
    padding: 1px 4px;
    background: #fff;
    border: 1px solid #eee;
    font-family: inherit;
    font-size: 8px;
    color: #333;

    :where(html.dark) & {
      background: #333;
      border-color: #444;
      color: #ccc;
    }
  }
}

.completion-error {
  padding: 12px 16px;
  color: #f56c6c;
  font-size: 12px;
}

// 过渡动画
.completion-fade-enter-active,
.completion-fade-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.completion-fade-enter-from,
.completion-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
