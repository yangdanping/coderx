<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M44.0001 24C44.0001 35.0457 35.0458 44 24.0001 44C18.0266 44 4.00006 44 4.00006 44C4.00006 44 4.00006 29.0722 4.00006 24C4.00006 12.9543 12.9544 4 24.0001 4C35.0458 4 44.0001 12.9543 44.0001 24Z"
      fill="none"
      :stroke="color"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- <path d="M14 18L32 18" :stroke="color" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /> -->
    <path d="M14 26H32" :stroke="color" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14 34H24" :stroke="color" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<script lang="ts" setup>
import { activeColor, defaultColor } from '@/global/constants/color';
const props = defineProps({
  size: {
    type: [Number],
    default: 20
  },
  color: {
    type: [String],
    default: defaultColor
  }
});
</script>

<style lang="scss" scoped></style>
