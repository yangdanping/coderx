<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M24 41C33.9411 41 42 32.678 42 27C42 21.322 33.9411 13 24 13C14.0589 13 6 21.3278 6 27C6 32.6722 14.0589 41 24 41Z"
      fill="none"
      :stroke="color"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M24 33C27.3137 33 30 30.3137 30 27C30 23.6863 27.3137 21 24 21C20.6863 21 18 23.6863 18 27C18 30.3137 20.6863 33 24 33Z"
      fill="none"
      :stroke="color"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M13.2637 11.2661L15.8582 14.8863" :stroke="color" stroke-width="3" stroke-linecap="round" />
    <path d="M35.625 11.7104L33.0304 15.3307" :stroke="color" stroke-width="3" stroke-linecap="round" />
    <path d="M24.0088 7V13" :stroke="color" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>

<script lang="ts" setup>
import { activeColor, defaultColor } from '@/global/constants/color';
defineProps({
  color: {
    type: String,
    default: defaultColor,
  },
  size: {
    type: [Number],
    default: 20,
  },
});
</script>

<style lang="scss" scoped></style>
