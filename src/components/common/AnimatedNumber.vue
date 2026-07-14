<template>
  <NumberFlow v-if="numericValue !== null" :value="numericValue" class="animated-number" />
  <span v-else class="animated-number animated-number--fallback">{{ fallbackText }}</span>
</template>

<script lang="ts" setup>
import NumberFlow from '@number-flow/vue';

/**
 * 数字变化时用 NumberFlow 做滚动动画；非数字文案（如「点赞」）保持普通文本。
 * @see https://number-flow.barvian.me/vue
 */
const { value = 0 } = defineProps<{
  value?: number | string | boolean | null;
}>();

const numericValue = computed(() => {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // 仅接受纯数字字符串，避免把「点赞」等文案误解析为 NaN/0
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  }
  return null;
});

const fallbackText = computed(() => {
  if (typeof value === 'boolean') return '0';
  return String(value ?? 0);
});
</script>

<style lang="scss" scoped>
.animated-number {
  display: inline;
  font-variant-numeric: tabular-nums;
  line-height: 0.85;
}
</style>
