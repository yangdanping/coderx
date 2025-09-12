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
    <!-- 用户信息icon -->
    <template v-else-if="type === 'coin'">
      <el-icon :color="color"><ICoin /></el-icon>
    </template>
    <template v-else-if="type === 'suitcase'">
      <el-icon :color="color"><ISuitcase /></el-icon>
    </template>
    <template v-else-if="type === 'coordinate'">
      <el-icon :color="color"><ICoordinate /></el-icon>
    </template>
    <template v-else-if="type === 'takeaway-box'">
      <el-icon :color="color"><ITakeawayBox /></el-icon>
    </template>
    <span v-if="showLabel" :style="{ color }">{{ label ?? 0 }}</span>
  </div>
</template>

<script lang="ts" setup>
import { activeColor, defaultColor } from '@/global/constants/color';
import ViewSvg from './cpns/ViewSvg.vue';
import LikeSvg from './cpns/LikeSvg.vue';
import CommentSvg from './cpns/CommentSvg.vue';
import StarSvg from './cpns/StarSvg.vue';
import FireSvg from './cpns/FireSvg.vue';

type IconType = 'views' | 'like' | 'comment' | 'star' | 'fire' | profileIconType;

type profileIconType = 'coin' | 'suitcase' | 'coordinate' | 'takeaway-box';

const {
  type,
  isActive = false,
  size = 20,
  label = 0,
  color: propColor = '',
  flex = 'row',
  showLabel = true,
} = defineProps<{
  type: IconType;
  isActive?: boolean;
  size?: number;
  label?: number | string | boolean;
  color?: string;
  flex?: 'row' | 'column';
  showLabel?: boolean;
}>();

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
