<template>
  <el-tabs :tab-position="tabPosition" v-model="activeId" @tab-click="handleClick">
    <el-tab-pane label="综合" name="综合"></el-tab-pane>
    <el-tab-pane v-for="item in tags" :key="item.id" :data-id="item.id" :label="item.name" :name="item.id"></el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import useArticleStore from '@/stores/article.store';
import useRootStore from '@/stores/index.store';
import type { Itag } from '@/stores/types/article.result';
import { throttle } from '@/utils';

const rootStore = useRootStore();
const { isSmallScreen } = storeToRefs(rootStore);

// 根据窗口宽度切换标签方向：小屏幕横向，大屏幕纵向
const tabPosition = computed(() => (isSmallScreen.value ? 'top' : 'right'));

const articleStore = useArticleStore();

const activeId = ref('综合');
const { tags = [] } = defineProps<{
  tags?: Itag[];
}>();

onMounted(() => {
  emitter.on('changeTagInList', (tag: any) => {
    activeId.value = tag.id;
    rootStore.changeTag(tag.id);
  });
  emitter.on('submitSearchValue', () => (activeId.value = '综合'));
});
const handleClick = throttle(function (tab) {
  if (tab.paneName) {
    // 不要使用 $reset()，它会重置 windowInfo 导致布局切换
    // 只重置分页和排序相关的字段
    rootStore.changePageNum(1);
    rootStore.changePageOrder('date');
    rootStore.changeTag(tab.paneName === '综合' ? '' : tab.paneName);
    // articleStore.refreshFirstPageAction(); // 移除旧逻辑，由 ArticleList(最新版) 自动响应 tagId 变化
  } else {
    rootStore.changePageNum(1);
    rootStore.changePageOrder('date');
    // articleStore.refreshFirstPageAction(); // 移除旧逻辑
  }
  // 切换标签后回到列表顶部
  window.scrollTo(0, 0);
}, 300);
</script>

<style lang="scss" scoped>
.el-tabs {
  :deep(.el-tabs__nav-scroll) {
    display: flex;
    justify-content: center;
    backdrop-filter: blur(10px);
    /* border-radius: 5px; */
    overflow: hidden;
  }

  :deep(.el-tabs__nav-wrap::after) {
    position: static !important;
  }

  :deep(.el-tabs__item) {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80px;
    height: 34px;
    font-weight: 400;
    font-size: 16px;
    flex-shrink: 0; // 防止标签被压缩
    &:hover {
      color: #409eff;
    }
    // 动态下划线
    &.is-active {
      background: #ecf5ff;
      color: #409eff;
      border: 1px solid #409eff;
    }
  }

  :deep(.el-tabs__active-bar) {
    padding: 0 80px;
    z-index: -99;
  }

  /**
   * 响应式布局总结：
   * 1. 核心机制：通过 tabPosition 响应式变量在 1200px 以下将侧边导航切换为顶部导航。
   * 2. 样式适配 (max-width: 1200px):
   *    - 允许滚动：nav-scroll 设为 overflow: visible 确保移动端滚动箭头可见。
   *    - 尺寸自适应：标签宽度由固定 80px 改为自适应 (auto)，配合 padding 确保文本不拥挤。
   *    - 激活条修正：移除垂直布局时的大尺寸 padding，使 active-bar 正确对齐水平标签。
   *    - 交互增强：针对水平滚动模式，美化了 ElementPlus 默认的左右导航箭头。
   */

  @media (max-width: 1200px) {
    :deep(.el-tabs__nav-scroll) {
      overflow: visible;
    }

    :deep(.el-tabs__item) {
      width: auto;
      min-width: 60px;
      padding: 0 16px;
    }

    :deep(.el-tabs__active-bar) {
      padding: 0;
    }

    :deep(.el-tabs__nav-prev),
    :deep(.el-tabs__nav-next) {
      line-height: 34px;
      height: 34px;
      color: #409eff;
      z-index: 10;
      background-color: rgba(255, 255, 255, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
