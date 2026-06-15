<template>
  <component :is="props.as" :data-scramble-word="props.target" :aria-label="props.target" class="scramble-frame-text">
    <span v-for="(character, index) in characters" :key="index" class="scrambl-cell" :class="{ 'scramble-accent-character': index === accentIndex }" aria-hidden="true">
      {{ character }}
    </span>
  </component>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    as?: string;
    frame: string;
    target: string;
  }>(),
  {
    as: 'span',
  },
);

const characters = computed(() => Array.from(props.frame));
const accentIndex = computed(() => {
  const targetLength = Array.from(props.target).length;

  return targetLength > 0 ? targetLength - 1 : -1;
});
</script>

<style scoped>
.scramble-frame-text {
  white-space: pre-wrap;
}

.scrambl-cell {
  align-items: center;
  display: inline-flex;
  height: 1em;
  justify-content: center;
  line-height: 1;
  width: 1ch;
  max-width: 1ch;
  overflow: hidden;
  text-align: center;
  vertical-align: middle;
}
</style>
