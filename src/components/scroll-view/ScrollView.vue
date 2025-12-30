<template>
  <div class="scroll-view-wrapper">
    <div v-if="showLeft" class="control left" @click="controlbtnClick(false)">
      <el-icon><ChevronLeft /> </el-icon>
    </div>
    <div v-if="showRight" class="control right" @click="controlbtnClick(true)">
      <el-icon><ChevronRight /> </el-icon>
    </div>
    <div class="scroll">
      <div class="scroll-content" ref="scrollContentRef">
        <slot name="scrollItems" :data="data"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
const { data = [] } = defineProps<{
  data?: any[];
}>();

watch(
  () => data,
  () => nextTick(() => initScrollContent()), //nextTick一定要加
);

const scrollContentRef = ref();
const showLeft = ref(false);
const showRight = ref(false);
const posIndex = ref(0);
let totalDistance = ref(0);
const initScrollContent = () => {
  const scrollWidth = scrollContentRef.value.scrollWidth;
  const clientWidth = scrollContentRef.value.clientWidth;
  console.log('总共可滚动的宽度', scrollWidth, '内容本身占据的宽度', clientWidth);
  totalDistance.value = scrollWidth - clientWidth; // 当前可滚动的距离
  showRight.value = totalDistance.value > 0;
};

// 事件处理逻辑
const controlbtnClick = (isRright: boolean) => {
  const newIndex = isRright ? ++posIndex.value : --posIndex.value; //注意++是无法改的
  // 获取当前将要滚动的item距离父级<定位>元素(.sroll-content)左边的距离
  const newOffsetLeft = scrollContentRef.value?.children[newIndex].offsetLeft ?? 0;
  scrollContentRef.value.style.transform = `translate(${-newOffsetLeft}px)`;
  console.log('item newOffsetLeft', newOffsetLeft);
  posIndex.value = newIndex;
  // 是否显示按钮
  showRight.value = totalDistance.value > newOffsetLeft;
  showLeft.value = newOffsetLeft > 0;
};
</script>

<style lang="scss" scoped>
.scroll-view-wrapper {
  position: relative; //加定位,使得拿到offsetLeft是待滚动子元素相对于该div的
  .scroll {
    overflow: hidden; //只隐藏滚动区域,避免将左右按钮也隐藏了
    .scroll-content {
      display: flex;
      align-items: center;
      transition: transform 0.2s;
      margin: 8px;
    }
  }

  .control {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    text-align: center;
    border-width: 2px;
    border-style: solid;
    border-color: #fff;
    background: #fff;
    box-shadow: 0px 1px 1px 1px rgba(0, 0, 0, 0.1);
    transition: box-shadow 200ms ease;
    z-index: 999;
    &:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    cursor: pointer;

    &.left {
      left: 0;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    &.right {
      right: 0;
      top: 50%;
      transform: translate(50%, -50%);
    }
  }
}
</style>
