<template>
  <div class="chat-demo">
    <div class="chat-demo__messages">
      <div v-for="(message, index) in messages" :key="`${message.role}-${index}`" class="chat-demo__message" :class="`is-${message.role}`">
        <div class="chat-demo__bubble">
          {{ message.content }}
        </div>
      </div>

      <div v-if="isThinking" class="chat-demo__message is-assistant">
        <div class="chat-demo__bubble chat-demo__bubble--thinking">
          <ThinkingShimmer text="AI 正在整理要点..." color="#8f959e" shimmer-color="#ffffff" />
        </div>
      </div>
    </div>

    <div class="chat-demo__composer">
      <div class="chat-demo__input">{{ inputDraft || inputPlaceholder }}</div>
      <button type="button" class="chat-demo__send">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import ThinkingShimmer from '@/components/icon/cpns/ThinkingShimmer.vue';
import { useAutoPlay } from '@/composables/useAutoPlay';
import aiChatDemoData from '@/views/home/data/ai-chat-demo.json';

import type { AiChatDemoData, ChatMessage } from './types/ai-chat-demo.type';

const props = defineProps<{
  active: boolean;
}>();

const demoData = aiChatDemoData as AiChatDemoData;
const messages = ref<ChatMessage[]>([]);
const inputDraft = ref('');
const isThinking = ref(false);
const hasStarted = ref(false);
const inputPlaceholder = '向 AI 提问或让它帮你总结...';

const { start } = useAutoPlay({
  loopDelay: aiChatDemoData.loopDelay,
});

const typeIntoDraft = async (text: string, speed: number, sleep: (ms: number) => Promise<boolean>) => {
  inputDraft.value = '';

  for (const char of text) {
    inputDraft.value += char;
    const keepGoing = await sleep(speed);
    if (!keepGoing) {
      return false;
    }
  }

  return true;
};

const streamAssistantReply = async (text: string, speed: number, sleep: (ms: number) => Promise<boolean>) => {
  const messageIndex =
    messages.value.push({
      role: 'assistant',
      content: '',
    }) - 1;

  const message = messages.value[messageIndex];
  if (!message) {
    return false;
  }

  for (const char of text) {
    message.content += char;
    const keepGoing = await sleep(speed);
    if (!keepGoing) {
      return false;
    }
  }

  return true;
};

const resetDemo = () => {
  messages.value = [];
  inputDraft.value = '';
  isThinking.value = false;
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

      for (const message of demoData.conversation) {
        if (message.role === 'user') {
          const typed = await typeIntoDraft(message.content, demoData.typingSpeed, sleep);
          if (!typed) {
            return;
          }

          const keepGoing = await sleep(350);
          if (!keepGoing) {
            return;
          }

          messages.value.push({
            role: 'user',
            content: inputDraft.value,
          });
          inputDraft.value = '';
          continue;
        }

        isThinking.value = true;
        const waited = await sleep(demoData.thinkingDelay);
        isThinking.value = false;
        if (!waited) {
          return;
        }

        const streamed = await streamAssistantReply(message.content, demoData.streamSpeed, sleep);
        if (!streamed) {
          return;
        }
      }
    });
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.chat-demo {
  display: flex;
  flex-direction: column;
  /* 设置固定高度，保留底部留白 */
  height: 380px;
  @include glass-effect;
  border: 1px solid #94b8ee;
  overflow: hidden;

  :where(html.dark) & {
    border-color: rgba(148, 184, 238, 0.4);
  }

  &__messages {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 4px 18px;
    overflow: hidden;
  }

  &__message {
    display: flex;

    &.is-user {
      justify-content: flex-end;
    }
  }

  &__bubble {
    max-width: 88%;
    padding: 12px 14px;
    line-height: 1.7;
    font-size: 14px;
    white-space: pre-wrap;
    color: var(--text-primary);
    background: #f0f5ff;

    :where(html.dark) & {
      background: #1e293b;
    }

    .is-user & {
      color: white;
      background: #94b8ee;
    }
  }

  &__bubble--thinking {
    min-width: 200px;
  }

  &__composer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    @include glass-effect-popup;
    border-top: 1px solid #94b8ee;

    :where(html.dark) & {
      border-color: rgba(148, 184, 238, 0.4);
    }
  }

  &__input {
    flex: 1;
    min-height: 46px;
    padding: 12px 14px;
    line-height: 1.6;
    font-size: 14px;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid #94b8ee;

    :where(html.dark) & {
      border-color: rgba(148, 184, 238, 0.4);
    }
  }

  &__send {
    border: 0;
    padding: 12px 16px;
    color: white;
    cursor: default;
    background: #94b8ee;
  }
}
</style>
