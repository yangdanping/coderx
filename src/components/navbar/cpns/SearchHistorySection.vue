<script lang="ts" setup>
import { History, Star, X } from '@lucide/vue';
import type { SearchHistoryItem } from '@/utils/LocalCache';

interface SearchHistorySectionProps {
  title: string;
  items: SearchHistoryItem[];
  favoriteIds: ReadonlySet<string>;
  clearable?: boolean;
}

const props = withDefaults(defineProps<SearchHistorySectionProps>(), {
  clearable: false,
});

const emit = defineEmits<{
  activate: [item: SearchHistoryItem];
  toggleFavorite: [item: SearchHistoryItem];
  remove: [id: string];
  clear: [];
}>();

const isFavorite = (id: string) => props.favoriteIds.has(id);
const getActivationLabel = (item: SearchHistoryItem) => (item.articleId === undefined ? `将“${item.value}”填入搜索框` : `打开文章“${item.value}”`);
</script>

<template>
  <section class="history-section">
    <header class="history-header">
      <h2 class="history-title">{{ title }}</h2>
      <button v-if="clearable" type="button" class="history-clear" @click="emit('clear')">清空</button>
    </header>

    <ul class="history-list">
      <li v-for="item in items" :key="item.id" class="history-row">
        <button type="button" class="history-item" :aria-label="getActivationLabel(item)" @click="emit('activate', item)">
          <History class="history-leading-icon" :size="18" aria-hidden="true" />
          <span class="history-text">{{ item.value }}</span>
        </button>

        <button
          type="button"
          class="history-action history-favorite"
          :class="{ 'is-favorite': isFavorite(item.id) }"
          :aria-label="isFavorite(item.id) ? `取消收藏“${item.value}”` : `收藏“${item.value}”`"
          :aria-pressed="isFavorite(item.id)"
          @click="emit('toggleFavorite', item)"
        >
          <Star :size="18" :fill="isFavorite(item.id) ? 'currentColor' : 'none'" aria-hidden="true" />
        </button>

        <button type="button" class="history-action history-delete" :aria-label="`删除“${item.value}”`" @click="emit('remove', item.id)">
          <X :size="18" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.history-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.history-title {
  margin: 0;
  color: var(--el-color-primary);
  font-size: 14px;
  font-weight: 700;
}

.history-clear {
  min-height: 32px;
  padding: 0 4px;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
  font: inherit;
  font-size: 12px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.history-row {
  display: flex;
  align-items: center;
  min-height: 46px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-secondary) 7%, transparent);
}

.history-item {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 46px;
  padding: 8px 10px;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  text-align: left;
}

.history-leading-icon {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.history-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-action {
  display: inline-flex;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
}

.history-favorite.is-favorite {
  color: var(--el-color-primary);
}

.history-clear:focus-visible,
.history-item:focus-visible,
.history-action:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
</style>
