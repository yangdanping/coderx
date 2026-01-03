<template>
  <div class="icon" role="button" :class="{ column: flex === 'column' }" @mouseenter="toggleHover(true)" @mouseleave="toggleHover(false)">
    <template v-if="type === 'views'">
      <Eye :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'like'">
      <ThumbsUp :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'comment'">
      <MessageSquare :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'star'">
      <Star :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'fire'">
      <Flame :size="iconSize" :color="color" />
    </template>
    <!-- 用户信息icon -->
    <template v-else-if="type === 'coin'">
      <Coins :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'suitcase'">
      <Briefcase :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'coordinate'">
      <MapPin :size="iconSize" :color="color" />
    </template>
    <template v-else-if="type === 'takeaway-box'">
      <Mail :size="iconSize" :color="color" />
    </template>
    <span v-if="showLabel" :style="{ color }">{{ label ?? 0 }}</span>
  </div>
</template>

<script lang="ts" setup>
import { activeColor, defaultColor } from '@/global/constants/color';
import { Eye, ThumbsUp, MessageSquare, Star, Flame, Coins, Briefcase, MapPin, Mail } from 'lucide-vue-next';
import useRootStore from '@/stores/index.store';
import { storeToRefs } from 'pinia';

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
  responsive = true,
} = defineProps<{
  type: IconType;
  isActive?: boolean;
  size?: number;
  label?: number | string | boolean;
  color?: string;
  flex?: 'row' | 'column';
  showLabel?: boolean;
  responsive?: boolean;
}>();

const rootStore = useRootStore();
const { isSmallScreen } = storeToRefs(rootStore);

// 根据屏幕尺寸动态调整图标大小
const iconSize = computed(() => {
  // 如果不启用响应式，直接返回原始尺寸
  if (responsive === false) {
    return size;
  }
  const baseSize = isSmallScreen.value ? 16 : size;
  // comment 类型的图标需要特殊处理，保持 size - 2 的逻辑
  if (type === 'comment') {
    return baseSize - 2;
  }
  return baseSize;
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
  gap: 5px;

  span {
    position: relative;
    top: 1px;
    line-height: 1;
  }
}

.icon.column {
  flex-direction: column;
  > span {
    font-size: 20px;
  }
}
</style>
