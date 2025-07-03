<template>
  <el-tabs tab-position="right" v-model="activeId" @tab-click="handleClick">
    <el-tab-pane label="综合" name="综合"></el-tab-pane>
    <el-tab-pane v-for="item in tags" :key="item.id" :data-id="item.id" :label="item.name" :name="item.id"></el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import useArticleStore from '@/stores/article';
import useRootStore from '@/stores';
import type { Itag } from '@/stores/types/article.result';
import { throttle } from '@/utils';

const articleStore = useArticleStore();
const rootStore = useRootStore();

const activeId = ref('综合');
defineProps({
  tags: {
    type: Array as PropType<Itag[]>,
    default: () => [],
  },
});

onMounted(() => {
  // articleStore.getTagsAction();
  emitter.on('changeTagInList', (tag: any) => {
    const { id } = tag;
    console.log('changeTagInList!!!!!!', id);
    activeId.value = id;
    rootStore.changeTag(id);
    articleStore.getArticleListAction();
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
    articleStore.getArticleListAction();
  } else {
    rootStore.$reset();
    articleStore.getArticleListAction();
  }
}, 300);
</script>

<style lang="scss" scoped>
.el-tabs {
  :deep(.el-tabs__nav-scroll) {
    display: flex;
    justify-content: center;
    background: #fafafa;
    border-radius: 10px;
    overflow: hidden;
  }

  :deep(.el-tabs__nav-wrap::after) {
    position: static !important;
  }

  :deep(.el-tabs__item) {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    &.is-active {
      color: #fff;
    }
  }

  :deep(.el-tabs__active-bar) {
    padding: 0 80px;
    z-index: -99;
  }
}
</style>
