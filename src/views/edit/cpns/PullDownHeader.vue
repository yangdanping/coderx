<template>
  <div class="pull-down-header" :style="headerStyle">
    <!-- 标题输入区域 -->
    <div class="title-input-container" v-show="isPulled">
      <input type="text" :value="modelValue" @input="handleInput" placeholder="在此输入标题..." class="title-input" ref="inputRef" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

interface Props {
  modelValue: string;
  isPulled: boolean;
  pullHeight?: string; // 下移高度/顶部留白高度，默认与 --navbarHeight 一致
}

const props = withDefaults(defineProps<Props>(), {
  pullHeight: 'var(--navbarHeight, 60px)',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:isPulled', value: boolean): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const headerStyle = computed(() => ({
  height: props.isPulled ? props.pullHeight : '0',
}));

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

// 下拉时自动聚焦输入框
watch(
  () => props.isPulled,
  (val) => {
    if (val) {
      setTimeout(() => {
        inputRef.value?.focus();
      }, 300); // 等待动画完成
    }
  },
);
</script>

<script lang="ts">
export default {
  name: 'PullDownHeader',
};
</script>

<style lang="scss" scoped>
.pull-down-header {
  position: relative;
  width: 100%;
  overflow: hidden;
  transition: height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
  background: var(--bg-color-primary);
  display: flex;
  align-items: center;
  padding: 0 40px;
  z-index: 103; // 提高层级，覆盖下方的绳子顶部

  .title-input-container {
    flex: 1;
    display: flex;
    align-items: center;

    .title-input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 32px;
      font-weight: bold;
      color: var(--text-primary);
      padding: 0;

      &::placeholder {
        color: var(--text-placeholder, #c9cdd4);
      }
    }
  }
}
</style>
