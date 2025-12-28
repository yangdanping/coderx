<template>
  <div class="history-item" @click="handleClick">
    <div class="item-cover">
      <img v-if="item.cover && item.cover.length > 0" :src="item.cover[0]" :alt="item.title" />
      <div v-else class="cover-placeholder">
        {{ item.title.charAt(0).toUpperCase() }}
      </div>
    </div>
    <div class="item-content">
      <div class="item-title">{{ item.title }}</div>
      <div class="item-meta">
        <div class="item-author">
          <Avatar :info="item.author" :src="item.author?.avatarUrl" :size="18" />
          <span>{{ item.author?.name || '未知作者' }}</span>
        </div>
        <div class="item-time" v-dateformat="item.updateAt"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import Avatar from '@/components/avatar/Avatar.vue';

const props = defineProps<{
  item: any;
}>();

const router = useRouter();

const handleClick = () => {
  const routeUrl = router.resolve({
    name: 'detail',
    params: { articleId: props.item.articleId },
  });
  window.open(routeUrl.href, '_blank');
};
</script>

<style lang="scss" scoped>
.history-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;

  &:hover {
    background-color: #f5f7fa;
  }

  &:last-child {
    margin-bottom: 0;
  }

  .item-cover {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s;
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #9de0ff 0%, #42b983 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      font-weight: bold;
    }
  }

  .item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .item-title {
      font-size: 13px;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .item-time {
        font-size: 11px;
        color: #7f8c8d;
        font-weight: 500;
      }

      .item-author {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #95a5a6;
      }
    }
  }
}
</style>
