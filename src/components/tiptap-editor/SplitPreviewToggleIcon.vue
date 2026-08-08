<template>
  <!-- 四角括号：外扩表示打开分栏，内收表示关闭分栏 -->
  <Minimize v-if="!expanded" class="split-preview-toggle-icon" :size="16" aria-hidden="true" />
  <Maximize v-else class="split-preview-toggle-icon" :size="16" aria-hidden="true" />
</template>

<script lang="ts" setup>
import { Maximize, Minimize } from '@lucide/vue';

defineProps<{
  expanded: boolean;
}>();
</script>
