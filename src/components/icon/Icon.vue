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

const props = defineProps({
  type: {
    type: String as PropType<IconType>,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  size: {
    type: [Number],
    default: 20
  },
  label: {
    type: [Number, String],
    default: 0
  },
  color: {
    type: [String],
    default: ''
  },
  flex: {
    type: String as PropType<'row' | 'column'>,
    default: 'row'
  }
});

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
  if (props.color) {
    return props.color;
  } else if (!props.isActive) {
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
