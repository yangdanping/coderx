<template>
  <div class="page">
    <el-pagination
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="[5, 10]"
      :pager-count="5"
      :total="total"
      layout="total,sizes,prev,pager,next,jumper"
    />
  </div>
</template>

<script lang="ts" setup>
const currentPage = defineModel<number>('currentPage', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 10 });

const { total = 0 } = defineProps<{
  total?: number;
}>();

const emit = defineEmits(['changePage']);

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  emit('changePage');
  window.scrollTo(0, 0);
};
const handleSizeChange = (size: number) => {
  currentPage.value = 1;
  pageSize.value = size;
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
