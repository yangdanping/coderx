<template>
  <div class="page">
    <el-pagination
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      v-model:current-page="pageNum"
      :page-size="pageSize"
      :page-sizes="[5, 10]"
      :pager-count="5"
      :total="total"
      layout="total,sizes,prev,pager,next,jumper"
    />
  </div>
</template>

<script lang="ts" setup>
import useRootStore from '@/stores';

const { total = 0 } = defineProps<{
  total?: number;
}>();

const rootStore = useRootStore();
const { pageNum, pageSize } = storeToRefs(rootStore);
const emit = defineEmits(['changePage']);

const handleCurrentChange = (pageNum) => {
  console.log('handleCurrentChange pageNum', pageNum);
  rootStore.changePageNum(pageNum);
  emit('changePage');
  window.scrollTo(0, 0);
};
const handleSizeChange = (pageSize) => {
  console.log('handleSizeChange pageSize', pageSize);
  rootStore.changePageNum(1);
  rootStore.changePageSize(pageSize);
  emit('changePage');
};
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}
</style>
