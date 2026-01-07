<template>
  <div class="user-history">
    <div class="list-header">
      <h2>{{ sex }}的浏览记录({{ historyStore.total }})</h2>
      <div class="header-actions" v-if="selectedItems.length > 0">
        <el-button type="danger" size="small" @click="handleBatchDelete" :loading="batchDeleting"> 删除选中({{ selectedItems.length }}) </el-button>
        <el-button type="warning" size="small" @click="handleClearAll" :loading="historyStore.loading"> 清空全部记录 </el-button>
      </div>
    </div>

    <div class="list">
      <template v-if="historyStore.historyList?.length">
        <div class="select-all-wrapper">
          <el-checkbox v-model="selectAll" @change="handleSelectAll" :indeterminate="indeterminate"> 全选 </el-checkbox>
        </div>
        <el-checkbox-group v-model="selectedItems">
          <template v-for="item in historyStore.historyList" :key="item.id">
            <el-checkbox :value="item.articleId" class="history-item">
              <HistoryListItem :item="item" :deleting-items="deletingItems" @delete-start="handleDeleteStart" @delete-end="handleDeleteEnd" />
            </el-checkbox>
          </template>
        </el-checkbox-group>

        <div class="load-more" v-if="historyStore.hasMore">
          <el-button @click="loadMore" :loading="historyStore.loading" size="large"> 加载更多 </el-button>
        </div>
      </template>
      <template v-else>
        <div class="empty-state">
          <span v-if="!historyStore.loading">{{ sex }}还没有浏览记录</span>
          <el-skeleton v-else :rows="5" animated />
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import HistoryListItem from '@/components/list/HistoryListItem.vue';
import useUserStore from '@/stores/user.store';
import useHistoryStore from '@/stores/history.store';
import { ElMessageBox } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
import { Msg } from '@/utils';

const userStore = useUserStore();
const historyStore = useHistoryStore();
const { profile } = storeToRefs(userStore);

// 多选相关状态
const selectedItems = ref<any[]>([]);
const selectAll = ref(false);
const indeterminate = ref(false);
const batchDeleting = ref(false);
const deletingItems = ref<any[]>([]);

const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));

// 监听选中项变化，更新全选状态
watch(
  selectedItems,
  (newVal) => {
    const totalItems = historyStore.historyList.length;
    console.log('totalItems', totalItems);
    selectAll.value = newVal.length === totalItems && totalItems > 0;
    indeterminate.value = newVal.length > 0 && newVal.length < totalItems;
  },
  { deep: true },
);

// 初始化时获取浏览记录
watch(
  () => profile.value.id,
  (newV) => {
    if (newV) {
      historyStore.resetHistory();
      historyStore.getHistoryAction(true);
    }
  },
);

// 全选/取消全选
const handleSelectAll = (checked: any) => {
  if (checked) {
    selectedItems.value = historyStore.historyList.map((item) => item.articleId);
  } else {
    selectedItems.value = [];
  }
};

// 加载更多
const loadMore = () => {
  historyStore.getHistoryAction(false);
};

// 删除开始
const handleDeleteStart = (articleId: any) => {
  deletingItems.value.push(articleId);
};

// 删除结束
const handleDeleteEnd = (articleId: any) => {
  deletingItems.value = deletingItems.value.filter((id) => id !== articleId);
  // 从选中列表中移除
  selectedItems.value = selectedItems.value.filter((id) => id !== articleId);
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedItems.value.length === 0) {
    Msg.showWarn('请先选择要删除的记录');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedItems.value.length} 条浏览记录吗？`, '批量删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });

    batchDeleting.value = true;
    const itemsToDelete = [...selectedItems.value];

    // 循环调用单个删除API
    for (const articleId of itemsToDelete) {
      await historyStore.deleteHistoryAction(articleId);
    }

    selectedItems.value = [];
    Msg.showSuccess(`成功删除 ${itemsToDelete.length} 条记录`);
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error);
      Msg.showFail('批量删除失败');
    }
  } finally {
    batchDeleting.value = false;
  }
};

// 清空全部记录
const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有浏览记录吗？此操作不可恢复！', '清空确认', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: true,
    });

    await historyStore.clearHistoryAction();
    selectedItems.value = [];
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空失败:', error);
    }
  }
};
</script>

<style lang="scss" scoped>
.user-history {
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ccc;
    padding-bottom: 10px;
    padding-left: 10px;

    h2 {
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }
  }

  .list {
    width: 100%;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    .select-all-wrapper {
      padding: 15px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .history-item {
      width: 100%;
      height: 100%;
      border-bottom: 1px solid #f0f0f0;

      :deep(.el-checkbox__label) {
        width: 96%;
      }
    }

    .load-more {
      text-align: center;
      padding: 20px 0;
    }

    .empty-state {
      text-align: center;
      padding: 50px 0;
      color: #999;
    }
  }
}
</style>
