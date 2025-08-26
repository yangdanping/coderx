<template>
  <div class="history-list-item">
    <div class="author">
      <Avatar :info="item.author" :src="item.author?.avatarUrl" />
      <div class="author-info">
        <span class="author-name">{{ item.author?.name }}</span>
        <span class="create-time" v-dateformat="item.createAt"></span>
      </div>
    </div>
    <a class="content-wrapper" :href="item.articleUrl" @click.stop.prevent="goDetail(item)">
      <div class="content">
        <h2 class="title">{{ item.title }}</h2>
      </div>
      <div class="actions">
        <el-button type="danger" size="small" circle plain @click.stop="handleDelete(item.articleId)" :loading="deletingItems.includes(item.articleId)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </a>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import { Delete } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import useHistoryStore from '@/stores/history';
import type { IArticle } from '@/stores/types/article.result';

const { item, deletingItems = [] } = defineProps<{
  item: any;
  deletingItems?: any[];
}>();

const emit = defineEmits(['delete-start', 'delete-end']);

const historyStore = useHistoryStore();

const goDetail = (item: IArticle) => window.open(item.articleUrl);

const handleDelete = async (articleId: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条浏览记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    emit('delete-start', articleId);
    await historyStore.deleteHistoryAction(articleId);
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error);
    }
  } finally {
    emit('delete-end', articleId);
  }
};
</script>

<style lang="scss" scoped>
.history-list-item {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 15px;
  margin: 10px 0;
  border-radius: 5px;
  transition: all 0.3s;
  color: var(--fontColor);

  &:hover {
    transform: scale(1.005);
    box-shadow: 1px 1px 8px rgba(100, 100, 100, 0.3);
  }

  .author {
    display: flex;
    align-items: center;
    margin-bottom: 10px;

    .author-info {
      display: flex;
      flex-direction: column;
      margin-left: 15px;
      gap: 5px;

      .author-name {
        font-weight: 500;
        color: var(--fontColor);
      }

      .create-time {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .content-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    text-decoration: none;

    .content {
      flex: 1;

      .title {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: var(--fontColor);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 600px;

        &:hover {
          color: #007bff;
        }
      }
    }

    .actions {
      flex-shrink: 0;
      margin-left: 15px;
    }
  }
}
</style>
