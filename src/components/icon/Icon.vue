<template>
  <div class="icon" :class="{ column: flex === 'column' }" @mouseenter="toggleHover(true)" @mouseleave="toggleHover(false)">
    <template v-if="type === 'views'">
      <ViewSvg :size="size" :color="color" />
    </template>
    <template v-else-if="type === 'like'">
      <LikeSvg :size="size" :color="color" />
    </template>
    <template v-else-if="type === 'comment'">
      <CommentSvg :size="size - 2" :color="color" />
    </template>
    <template v-else-if="type === 'star'">
      <StarSvg :size="size" :color="color" />
    </template>
    <template v-else-if="type === 'fire'">
      <FireSvg :size="size" :color="color" />
    </template>
    <span v-if="except(type)" :style="{ color }">{{ label ?? 0 }}</span>
  </div>
</template>

<script lang="ts" setup>
import { activeColor, defaultColor } from '@/global/constants/color';
import ViewSvg from './cpns/ViewSvg.vue';
import LikeSvg from './cpns/LikeSvg.vue';
import CommentSvg from './cpns/CommentSvg.vue';
import StarSvg from './cpns/StarSvg.vue';
import FireSvg from './cpns/FireSvg.vue';

type IconType = 'views' | 'like' | 'comment' | 'star' | 'fire';

const {
  type,
  isActive = false,
  size = 20,
  label = 0,
  color: propColor = '',
  flex = 'row',
} = defineProps<{
  type: IconType;
  isActive?: boolean;
  size?: number;
  label?: number | string;
  color?: string;
  flex?: 'row' | 'column';
}>();

const except = computed(() => {
  return (type: IconType) => {
    if (type === 'star') {
      return false;
    } else if (type === 'fire') {
      return false;
    } else {
      return true;
    }
  };
});
const color = computed(() => {
  if (propColor) {
    return propColor;
  } else if (!isActive) {
    return !isHover.value ? defaultColor : activeColor;
  } else {
    return activeColor;
  }
});

const isHover = ref(false);
const toggleHover = (toggle: boolean) => {
  isHover.value = toggle;
};
</script>

<style lang="scss" scoped>
.icon {
  display: flex;
  align-items: center;
  flex-direction: row;
}

.icon.column {
  flex-direction: column;
  > span {
    font-size: 20px;
  }
}
</style>
