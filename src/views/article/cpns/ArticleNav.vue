<template>
  <el-tabs tab-position="right" v-model="activeId" @tab-click="handleClick">
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

const articleStore = useArticleStore();
const rootStore = useRootStore();

const activeId = ref('综合');
const { tags = [] } = defineProps<{
  tags?: Itag[];
}>();

onMounted(() => {
  // articleStore.getTagsAction();
  emitter.on('changeTagInList', (tag: any) => {
    const { id } = tag;
    console.log('changeTagInList!!!!!!', id);
    activeId.value = id;
    rootStore.changeTag(id);
    // articleStore.refreshFirstPageAction(); // 移除旧逻辑
  });
  emitter.on('submitSearchValue', () => (activeId.value = '综合'));
});
const emit = defineEmits(['changeTagInNav']);
const handleClick = throttle(function (tab) {
  console.log('更换标签!!!!', tab.paneName);
  emitter.emit('changeTagInNav');
  emit('changeTagInNav');
  if (tab.paneName) {
    rootStore.$reset();
    rootStore.changeTag(tab.paneName === '综合' ? '' : tab.paneName);
    // articleStore.refreshFirstPageAction(); // 移除旧逻辑，由 ArticleList(最新版) 自动响应 tagId 变化
  } else {
    rootStore.$reset();
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
    color: var(--fontColor);
    width: 80px;
    height: 34px;
    font-weight: 400;
    font-size: 16px;
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
}
</style>
