<template>
  <div class="dev-page">
    <FlowCordWidget v-model="cordOpen" controls-id="dev-page-a11y" />

    <FlowDevConfetti ref="confettiRef" />

    <div id="dev-page-a11y" class="dev-sr" aria-live="polite">
      <template v-if="cordOpen">已触发庆祝动画</template>
    </div>

    <div class="dev-main">
      <div class="dev-card">
        <component :is="iconComp" class="dev-icon" :size="40" stroke-width="1.75" aria-hidden="true" />
        <h1 class="dev-title">{{ card.heading }}</h1>
        <p v-if="hintVisible" class="dev-hint">
          <template v-if="card.hintBefore">{{ card.hintBefore }}</template>
          <code v-if="card.hintCode">{{ card.hintCode }}</code>
          <template v-if="card.hintAfter">{{ card.hintAfter }}</template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { Hammer } from 'lucide-vue-next';
import FlowCordWidget from '@/views/flow/cpns/FlowCordWidget.vue';
import FlowDevConfetti from '@/views/flow/cpns/FlowDevConfetti.vue';

/** 路由 `meta.devCard` 结构*/
interface DevRouteCardMeta {
  icon?: string;
  heading?: string;
  hintBefore?: string;
  hintCode?: string;
  hintAfter?: string;
}

/** 在 meta.devCard.icon 中使用的 Lucide 名须在此注册，避免 `import *` 整包打进 bundle */
const DEV_CARD_ICONS: Record<string, Component> = {
  Hammer,
};

const route = useRoute();

const card = computed(() => {
  const d = route.meta.devCard as DevRouteCardMeta | undefined;
  const title = typeof route.meta.title === 'string' ? route.meta.title : undefined;
  return {
    icon: d?.icon ?? 'Hammer',
    heading: d?.heading ?? title ?? '开发中',
    hintBefore: d?.hintBefore ?? '',
    hintCode: d?.hintCode,
    hintAfter: d?.hintAfter ?? '',
  };
});

const iconComp = computed(() => DEV_CARD_ICONS[card.value.icon] ?? Hammer);

const hintVisible = computed(() => !!(card.value.hintBefore || card.value.hintCode || card.value.hintAfter));

const cordOpen = ref(false);
const confettiRef = ref<InstanceType<typeof FlowDevConfetti> | null>(null);

watch(cordOpen, (open) => {
  if (open) {
    nextTick(() => confettiRef.value?.burst());
  }
});
</script>

<style lang="scss" scoped>
.dev-page {
  --flow-column-width: clamp(340px, 55vw, 880px);

  box-sizing: border-box;
  position: relative;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.dev-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dev-main {
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 48px;
}

.dev-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  max-width: 420px;

  .dev-icon {
    color: color-mix(in oklch, var(--green) 75%, var(--fontColor));
    opacity: 0.9;
  }

  .dev-title {
    margin: 0;
    font-size: clamp(1.35rem, 4vw, 1.75rem);
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.06em;
  }

  .dev-hint {
    margin: 0;
    font-size: 14px;
    color: color-mix(in oklch, var(--fontColor) 72%, transparent);

    code {
      font-size: 0.9em;
      padding: 2px 8px;
      border-radius: 6px;
      background: color-mix(in oklch, var(--fontColor) 8%, transparent);
    }
  }
}
</style>
