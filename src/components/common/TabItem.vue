<template>
  <div
    class="tab-item"
    role="button"
    :class="{
      'is-active': isActive,
      vertical: direction === 'vertical',
      horizontal: direction === 'horizontal',
    }"
    @click="handleClick"
  >
    <div class="tab-icon" v-if="$slots.icon">
      <slot name="icon"></slot>
    </div>
    <div class="tab-label">
      <slot>{{ label }}</slot>
    </div>
    <!-- Active indicator bar for horizontal mode -->
    <div v-if="isActive && direction === 'horizontal'" class="active-bar"></div>
  </div>
</template>

<script lang="ts" setup>
import { inject, computed } from 'vue';

const { name, label = '' } = defineProps<{
  name: string | number;
  label?: string;
}>();

// Type the injected context
interface TabsContext {
  activeValue: { value: string | number };
  handleTabClick: (name: string | number) => void;
  direction: { value: string };
}

const tabsContext = inject<TabsContext>('tabsContext');

if (!tabsContext) {
  throw new Error('TabItem must be used within Tabs component');
}

const isActive = computed(() => tabsContext.activeValue.value === name);
const direction = computed(() => tabsContext.direction.value);

const handleClick = () => {
  tabsContext.handleTabClick(name);
};
</script>

<style lang="scss" scoped>
.tab-item {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s;
  color: var(--fontColor);

  &.vertical {
    padding: 8px 20px;
    border-radius: 4px;
    justify-content: flex-start; // Align left in vertical mode usually

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #409eff;
    }

    &.is-active {
      background-color: #ecf5ff;
      color: #409eff;
      font-weight: 600;
    }
  }

  &.horizontal {
    padding: 8px 16px;
    flex-shrink: 0;

    &:hover {
      color: #409eff;
    }

    &.is-active {
      color: #409eff;
      font-weight: 600;
    }

    .active-bar {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background-color: #409eff;
      border-radius: 1px;
    }
  }

  .tab-icon {
    margin-right: 6px;
    display: flex;
    align-items: center;
  }
}
</style>
