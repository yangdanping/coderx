<template>
  <div class="search">
    <button type="button" class="search-trigger" :aria-expanded="isDialogOpen" aria-haspopup="dialog" aria-label="打开搜索面板" @click="toggleDialog">
      <Search class="search-trigger-icon" :size="18" aria-hidden="true" />
      <kbd class="search-shortcut">{{ shortcutText }}</kbd>
    </button>

    <Teleport to="body">
      <Transition name="search-overlay">
        <div v-if="isDialogOpen" class="search-overlay" @click="closeDialog">
          <section class="search-dialog" role="dialog" aria-modal="true" aria-label="搜索 CoderX" @click.stop>
            <div class="search-input-shell">
              <Search class="search-input-icon" :size="24" aria-hidden="true" />
              <input
                ref="searchInput"
                v-model="searchValue"
                class="search-input"
                type="search"
                name="coderx-search"
                aria-label="Search CoderX"
                placeholder="Vue, TypeScript…"
                autocomplete="off"
                inputmode="search"
                spellcheck="false"
                @keyup.enter="submitSearch"
                @compositionstart="handleCompositionStart"
                @compositionend="handleCompositionEnd"
              />
            </div>

            <div class="search-panel">
              <template v-if="!searchValue && searchHistory.length">
                <div class="search-panel-header">
                  <span class="header-title">历史记录</span>
                  <button type="button" class="clear-btn" @click="clearAllHistory">清空</button>
                </div>

                <div class="history-content">
                  <div
                    v-for="(item, index) in searchHistory"
                    :key="item"
                    class="history-chip"
                    @mouseenter="hoveredIndex = index"
                    @mouseleave="hoveredIndex = -1"
                    @focusin="hoveredIndex = index"
                    @focusout="hoveredIndex = -1"
                  >
                    <button type="button" class="history-item" :style="getItemStyle(index)" @click="selectHistoryItem(item)">
                      <span class="history-text">{{ item }}</span>
                    </button>
                    <button v-show="hoveredIndex === index" type="button" class="delete-icon" aria-label="删除历史记录" @click.stop="removeHistoryItem(item)">
                      <Trash2 :size="12" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </template>

              <div v-if="searchValue" class="search-result-content" :class="{ showborder: searchHistory.length > 0 }">
                <template v-if="!isLoading">
                  <template v-if="searchResults.length">
                    <button v-for="item in searchResults" :key="item.id" type="button" class="result-item" @click="goToArticle(item)">
                      <span v-for="(part, partIndex) in getHighlightedSearchParts(item.title, searchValue)" :key="`${item.id}-${partIndex}`" :class="{ 'search-match': part.matched }">
                        {{ part.text }}
                      </span>
                    </button>
                  </template>
                  <div v-else class="no-data-text">未找到相关内容</div>
                </template>
                <div v-else class="loading" v-loading="true"></div>
              </div>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { Search, Trash2 } from '@lucide/vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { debounce } from '@/utils';
import { getHighlightedSearchParts, getSearchShortcutText, isSearchToggleShortcut, normalizeSearchKeyword } from '@/utils/search';
import LocalCache from '@/utils/LocalCache';
import useArticleStore from '@/stores/article.store';
import { search } from '@/service/article/article.request';

interface SearchResultItem {
  id: number | string;
  title: string;
}

const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const searchValue = shallowRef('');
const debouncedSearchValue = shallowRef('');
const isDialogOpen = shallowRef(false);
const searchHistory = shallowRef<string[]>([]);
const hoveredIndex = shallowRef(-1);
const isComposing = shallowRef(false);
const shortcutText = computed(() => getSearchShortcutText());

const articleStore = useArticleStore();
const router = useRouter();
const route = useRoute();

watch(
  () => route.query.q,
  (newQ) => {
    if (route.path === '/search' && typeof newQ === 'string') {
      searchValue.value = newQ;
    }
  },
  { immediate: true },
);

const updateDebouncedValue = debounce(() => {
  debouncedSearchValue.value = searchValue.value;
}, 500);

watch(searchValue, (newVal) => {
  if (!normalizeSearchKeyword(newVal)) {
    debouncedSearchValue.value = '';
    return;
  }

  updateDebouncedValue();
});

const normalizedDebouncedSearchValue = computed(() => normalizeSearchKeyword(debouncedSearchValue.value));

const { data: searchData, isLoading } = useQuery({
  queryKey: computed(() => ['search', normalizedDebouncedSearchValue.value]),
  queryFn: ({ signal }) => search(debouncedSearchValue.value, signal),
  enabled: computed(() => !!normalizedDebouncedSearchValue.value),
  staleTime: 1000 * 60,
  select: (res) => res.data as SearchResultItem[],
});

const searchResults = computed(() => searchData.value || []);

let originalBodyOverflow = '';

const lockBodyScroll = () => {
  originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.overflow = originalBodyOverflow;
};

watch(isDialogOpen, async (open) => {
  if (open) {
    lockBodyScroll();
    loadSearchHistory();
    await nextTick();
    if (shouldFocusSearchInput()) {
      searchInput.value?.focus();
    }
    return;
  }

  unlockBodyScroll();
});

const openDialog = () => {
  isDialogOpen.value = true;
};

const closeDialog = () => {
  isDialogOpen.value = false;
  hoveredIndex.value = -1;
};

const toggleDialog = () => {
  isDialogOpen.value ? closeDialog() : openDialog();
};

const shouldFocusSearchInput = () => typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 768px)').matches;

const handleKeydown = (event: KeyboardEvent) => {
  if (isSearchToggleShortcut(event)) {
    event.preventDefault();
    toggleDialog();
    return;
  }

  if (event.key === 'Escape' && isDialogOpen.value) {
    event.preventDefault();
    closeDialog();
  }
};

const handleCompositionStart = () => (isComposing.value = true);

const handleCompositionEnd = () => {
  setTimeout(() => (isComposing.value = false), 100);
};

const borderColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#ff6b9d', '#9c27b0', '#00bcd4', '#ff9800', '#795548'];

const getItemStyle = (index: number) => {
  const color = borderColors[index % borderColors.length];
  return { borderColor: color, color };
};

const loadSearchHistory = () => {
  searchHistory.value = LocalCache.getSearchHistory();
};

const selectHistoryItem = (value: string) => {
  searchValue.value = value;
  submitSearch();
};

const removeHistoryItem = (item: string) => {
  LocalCache.removeSearchHistory(item);
  loadSearchHistory();
};

const clearAllHistory = () => {
  LocalCache.clearSearchHistory();
  loadSearchHistory();
};

const submitSearch = () => {
  if (isComposing.value) return;

  const visibleKeyword = searchValue.value.trim();
  if (!visibleKeyword) return;

  LocalCache.addSearchHistory(visibleKeyword);
  loadSearchHistory();
  closeDialog();

  articleStore.activeTagId = '综合';
  router.push({ path: '/search', query: { q: visibleKeyword } });
};

const goToArticle = (item: SearchResultItem) => {
  LocalCache.addSearchHistory(item.title);
  loadSearchHistory();
  closeDialog();

  const routeUrl = router.resolve({ name: 'detail', params: { articleId: item.id } });
  window.open(routeUrl.href, '_blank');
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  loadSearchHistory();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  unlockBodyScroll();
});
</script>

<style lang="scss" scoped>
.search {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.search-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 74px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--text-secondary) 22%, transparent);
  border-radius: 6px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--glass-bg) 82%, transparent);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: var(--text-primary);
    border-color: color-mix(in srgb, var(--el-color-primary) 48%, transparent);
    background: var(--glass-bg-popup);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.search-trigger-icon {
  flex: 0 0 auto;
}

.search-shortcut {
  min-width: 34px;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  border-radius: 5px;
  font-family: MapleMono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  background: color-mix(in srgb, var(--bg-color-primary) 72%, transparent);
}

.search-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: calc(var(--navbarHeight) + 28px) 16px 24px;
  background: rgba(31, 36, 48, 0.54);
  backdrop-filter: blur(4px);
  overscroll-behavior: contain;
}

.search-dialog {
  width: min(720px, 100%);
  max-height: min(72vh, 680px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 44%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-bg-popup) 96%, var(--bg-color-primary));
  overscroll-behavior: contain;
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

.search-input-shell {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color-list) 78%, transparent);
}

.search-input-icon {
  color: var(--el-color-primary);
}

.search-input {
  min-width: 0;
  height: 42px;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 22px;
  letter-spacing: 0;

  &::placeholder {
    color: color-mix(in srgb, var(--text-secondary) 58%, transparent);
  }
}

.search-panel {
  min-height: 72px;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 12px 20px 18px;
}

.search-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.header-title {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
}

.clear-btn {
  min-height: 32px;
  padding: 0 4px;
  border: 0;
  color: var(--el-color-primary);
  background: transparent;
  font-size: 13px;

  &:hover {
    color: #66b1ff;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.history-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 140px;
}

.history-item {
  display: inline-flex;
  align-items: center;
  max-width: 140px;
  min-height: 32px;
  padding: 4px 10px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: color-mix(in srgb, var(--bg-color-primary) 68%, transparent);
  font-size: 12px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, currentColor 8%, var(--bg-color-primary));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}

.history-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.delete-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: #b9b4ae;

  &:hover {
    background: #f78989;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.search-result-content {
  min-height: 44px;

  &.showborder {
    border-top: 1px solid var(--border-color-list);
    padding-top: 10px;
  }
}

.result-item {
  display: block;
  width: 100%;
  min-height: 42px;
  padding: 10px 0;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    color: #03a9f4;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.search-match {
  padding: 1px 2px;
  border-radius: 2px;
  color: #29313a;
  background-color: #9de0ff;
  font-weight: 700;
}

.no-data-text {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  color: var(--text-secondary);
  font-size: 14px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60px;
}

.search-overlay-enter-active,
.search-overlay-leave-active {
  transition: opacity 0.18s ease;

  .search-dialog {
    transition:
      transform 0.2s ease,
      opacity 0.18s ease;
  }
}

.search-overlay-enter-from,
.search-overlay-leave-to {
  opacity: 0;

  .search-dialog {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-trigger,
  .history-item,
  .search-overlay-enter-active,
  .search-overlay-leave-active,
  .search-overlay-enter-active .search-dialog,
  .search-overlay-leave-active .search-dialog {
    transition: none;
  }

  .search-trigger:hover,
  .history-item:hover,
  .search-overlay-enter-from .search-dialog,
  .search-overlay-leave-to .search-dialog {
    transform: none;
  }
}

@media (max-width: 768px) {
  .search {
    width: 100%;
    justify-content: center;
  }

  .search-trigger {
    min-width: 62px;
    width: auto;
    height: 40px;
    padding-inline: 10px;
  }

  .search-overlay {
    display: block;
    overflow: hidden;
    padding: 0;
    background: rgba(31, 36, 48, 0.66);
  }

  .search-dialog {
    width: 100vw;
    max-width: 100vw;
    min-height: 100vh;
    max-height: none;
    border-width: 0;
    border-radius: 0;
    background: var(--bg-color-primary);
  }

  @supports (min-height: 100dvh) {
    .search-dialog {
      min-height: 100dvh;
    }
  }

  .search-input-shell {
    padding: max(16px, env(safe-area-inset-top)) 16px 14px;
    grid-template-columns: 26px minmax(0, 1fr);
  }

  .search-input {
    height: 40px;
    font-size: 20px;
  }

  .search-panel {
    padding: 12px 16px calc(24px + env(safe-area-inset-bottom));
  }

  .history-chip,
  .history-item {
    min-height: 36px;
    max-width: min(44vw, 180px);
  }
}
</style>
