<template>
  <div class="search">
    <button ref="searchTrigger" type="button" class="search-trigger" :aria-expanded="isDialogOpen" aria-haspopup="dialog" aria-label="打开搜索面板" @click="toggleDialog">
      <span class="search-trigger-icon-wrap">
        <Search class="search-trigger-icon" :size="18" aria-hidden="true" />
        <svg class="search-trigger-sparkle" viewBox="0 0 12 12" fill="none" focusable="false" aria-hidden="true">
          <path d="M6 0.75C6.25 3.9 8.1 5.75 11.25 6C8.1 6.25 6.25 8.1 6 11.25C5.75 8.1 3.9 6.25 0.75 6C3.9 5.75 5.75 3.9 6 0.75Z" fill="currentColor" />
        </svg>
      </span>
      <kbd class="search-shortcut">{{ shortcutText }}</kbd>
    </button>

    <Teleport to="body">
      <Transition name="search-overlay" @after-leave="handleDialogAfterLeave">
        <div v-if="isDialogOpen" class="search-overlay" @click="closeDialog">
          <section ref="searchDialog" class="search-dialog" role="dialog" aria-modal="true" aria-label="搜索 CoderX" tabindex="-1" @click.stop @keydown="handleDialogKeydown">
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
                @keydown.down.prevent="moveResultSelection(1)"
                @keydown.up.prevent="moveResultSelection(-1)"
                @keydown.enter.prevent="handleSearchEnter"
                @compositionstart="handleCompositionStart"
                @compositionend="handleCompositionEnd"
              />
              <button v-if="isMobileDialog" ref="searchDialogClose" type="button" class="search-dialog-close" aria-label="关闭搜索面板" @click="closeDialog">
                <X :size="22" aria-hidden="true" />
              </button>
            </div>

            <div class="search-panel" :aria-busy="isLoading">
              <div v-if="searchValue" class="search-result-content">
                <div v-if="isError" class="search-error">搜索失败，请稍后重试</div>
                <template v-else-if="!isLoading">
                  <div v-if="searchResults.length" class="search-result-list" role="listbox" aria-label="文章搜索结果">
                    <button
                      v-for="(item, index) in searchResults"
                      :key="item.id"
                      type="button"
                      class="search-result-option"
                      :class="{ 'is-active': activeResultIndex === index }"
                      role="option"
                      :aria-selected="activeResultIndex === index"
                      @mouseenter="activeResultIndex = index"
                      @focus="activeResultIndex = index"
                      @click="activateSearchResult(item)"
                    >
                      <span v-for="(part, partIndex) in getHighlightedSearchParts(item.title, searchValue)" :key="`${item.id}-${partIndex}`" :class="{ 'search-match': part.matched }">
                        {{ part.text }}
                      </span>
                    </button>
                  </div>
                  <div v-else class="no-data-text">未找到相关内容</div>
                </template>
                <div v-else class="loading" v-loading="true"></div>
              </div>

              <SearchHistorySection
                v-if="searchHistory.length"
                class="search-history-section"
                title="搜索历史"
                :items="searchHistory"
                :favorite-ids="favoriteHistoryIds"
                clearable
                @activate="activateHistoryItem"
                @toggle-favorite="toggleFavorite"
                @remove="removeHistoryItem"
                @clear="clearAllHistory"
              />

              <SearchHistorySection
                v-if="favoriteSearchHistory.length"
                class="favorite-history-section"
                title="收藏"
                :items="favoriteSearchHistory"
                :favorite-ids="favoriteHistoryIds"
                @activate="activateHistoryItem"
                @toggle-favorite="toggleFavorite"
                @remove="removeFavoriteItem"
              />
            </div>
            <p class="search-status" role="status" aria-live="polite" aria-atomic="true">{{ searchStatusText }}</p>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { Search, X } from '@lucide/vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import SearchHistorySection from './SearchHistorySection.vue';
import { debounce } from '@/utils';
import { getHighlightedSearchParts, getSearchShortcutText, isSearchToggleShortcut, normalizeSearchKeyword } from '@/utils/search';
import LocalCache, { type SearchHistoryItem } from '@/utils/LocalCache';
import useArticleStore from '@/stores/article.store';
import { search } from '@/service/article/article.request';

interface SearchResultItem {
  id: number | string;
  title: string;
}

const searchTrigger = useTemplateRef<HTMLButtonElement>('searchTrigger');
const searchDialog = useTemplateRef<HTMLElement>('searchDialog');
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const searchDialogClose = useTemplateRef<HTMLButtonElement>('searchDialogClose');
const searchValue = shallowRef('');
const debouncedSearchValue = shallowRef('');
const isDialogOpen = shallowRef(false);
const isMobileDialog = shallowRef(false);
const searchHistory = shallowRef<SearchHistoryItem[]>([]);
const favoriteSearchHistory = shallowRef<SearchHistoryItem[]>([]);
const activeResultIndex = shallowRef(-1);
const isComposing = shallowRef(false);
const shortcutText = computed(() => getSearchShortcutText());
const favoriteHistoryIds = computed(() => new Set(favoriteSearchHistory.value.map((item) => item.id)));

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

const { data: searchData, isLoading, isError } = useQuery({
  queryKey: computed(() => ['search', normalizedDebouncedSearchValue.value]),
  queryFn: ({ signal }) => search(normalizedDebouncedSearchValue.value, signal),
  enabled: computed(() => !!normalizedDebouncedSearchValue.value),
  staleTime: 1000 * 60,
  select: (res) => res.data as SearchResultItem[],
});

const searchResults = computed(() => searchData.value || []);

watch(searchResults, (results) => {
  activeResultIndex.value = results.length ? 0 : -1;
});

const searchStatusText = computed(() => {
  if (!normalizedDebouncedSearchValue.value) return '';
  if (isLoading.value) return '正在搜索…';
  if (isError.value) return '搜索失败，请稍后重试';

  const resultCount = searchResults.value.length;
  return resultCount ? `找到 ${resultCount} 条相关内容` : '未找到相关内容';
});

let originalBodyOverflow = '';
let appRoot: HTMLElement | null = null;
let appRootWasInert = false;
let modalEnvironmentActive = false;

const lockBodyScroll = () => {
  originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.overflow = originalBodyOverflow;
};

const makeBackgroundInert = () => {
  appRoot = document.querySelector<HTMLElement>('#app');
  appRootWasInert = appRoot?.hasAttribute('inert') ?? false;
  appRoot?.setAttribute('inert', '');
};

const restoreBackgroundInteractivity = () => {
  if (appRoot && !appRootWasInert) {
    appRoot.removeAttribute('inert');
  }
  appRoot = null;
  appRootWasInert = false;
};

const activateModalEnvironment = () => {
  if (modalEnvironmentActive) return;

  lockBodyScroll();
  makeBackgroundInert();
  modalEnvironmentActive = true;
};

const deactivateModalEnvironment = () => {
  if (!modalEnvironmentActive) return;

  unlockBodyScroll();
  restoreBackgroundInteractivity();
  modalEnvironmentActive = false;
};

watch(isDialogOpen, async (open) => {
  if (!open) return;

  activateModalEnvironment();
  loadSearchHistory();
  await nextTick();
  (isMobileDialog.value ? searchDialogClose.value : searchInput.value)?.focus();
});

const handleDialogAfterLeave = async () => {
  if (isDialogOpen.value) return;

  deactivateModalEnvironment();
  await nextTick();
  searchTrigger.value?.focus();
};

const openDialog = () => {
  isMobileDialog.value = mobileViewportQuery?.matches ?? isMobileViewport();
  isDialogOpen.value = true;
};

const closeDialog = () => {
  isDialogOpen.value = false;
  activeResultIndex.value = -1;
};

const toggleDialog = () => {
  isDialogOpen.value ? closeDialog() : openDialog();
};

const mobileViewportMedia = '(max-width: 768px)';
let mobileViewportQuery: MediaQueryList | null = null;

const isMobileViewport = () => typeof window.matchMedia === 'function' && window.matchMedia(mobileViewportMedia).matches;

const handleMobileViewportChange = (event: MediaQueryListEvent) => {
  isMobileDialog.value = event.matches;
};

const registerMobileViewportListener = () => {
  if (typeof window.matchMedia !== 'function') return;

  mobileViewportQuery = window.matchMedia(mobileViewportMedia);
  isMobileDialog.value = mobileViewportQuery.matches;
  if (typeof mobileViewportQuery.addEventListener === 'function') {
    mobileViewportQuery.addEventListener('change', handleMobileViewportChange);
  } else {
    mobileViewportQuery.addListener(handleMobileViewportChange);
  }
};

const unregisterMobileViewportListener = () => {
  if (!mobileViewportQuery) return;

  if (typeof mobileViewportQuery.removeEventListener === 'function') {
    mobileViewportQuery.removeEventListener('change', handleMobileViewportChange);
  } else {
    mobileViewportQuery.removeListener(handleMobileViewportChange);
  }
  mobileViewportQuery = null;
};

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const handleDialogKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || !searchDialog.value) return;

  const focusableElements = Array.from(searchDialog.value.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements.at(-1);
  if (!firstFocusable || !lastFocusable) return;

  if (event.shiftKey && document.activeElement === firstFocusable) {
    event.preventDefault();
    lastFocusable.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable.focus();
  }
};

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

const loadSearchHistory = () => {
  searchHistory.value = LocalCache.getSearchHistory();
  favoriteSearchHistory.value = LocalCache.getFavoriteSearchHistory();
};

const activateHistoryItem = async (item: SearchHistoryItem) => {
  if (item.articleId !== undefined) {
    closeDialog();
    await router.push({ name: 'detail', params: { articleId: item.articleId } });
    return;
  }

  searchValue.value = item.value;
  await nextTick();
  searchInput.value?.focus();
};

const toggleFavorite = (item: SearchHistoryItem) => {
  LocalCache.toggleFavoriteSearchHistory(item);
  loadSearchHistory();
};

const removeHistoryItem = (id: string) => {
  LocalCache.removeSearchHistory(id);
  loadSearchHistory();
};

const removeFavoriteItem = (id: string) => {
  const item = favoriteSearchHistory.value.find((favoriteItem) => favoriteItem.id === id);
  if (!item) return;

  LocalCache.toggleFavoriteSearchHistory(item);
  loadSearchHistory();
};

const clearAllHistory = () => {
  LocalCache.clearSearchHistory();
  loadSearchHistory();
};

const moveResultSelection = (direction: 1 | -1) => {
  const resultCount = searchResults.value.length;
  if (!resultCount) {
    activeResultIndex.value = -1;
    return;
  }

  activeResultIndex.value = (activeResultIndex.value + direction + resultCount) % resultCount;
};

const activateSearchResult = async (item: SearchResultItem) => {
  LocalCache.addSearchHistory({ value: item.title, articleId: item.id });
  loadSearchHistory();
  closeDialog();
  await router.push({ name: 'detail', params: { articleId: item.id } });
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

const handleSearchEnter = () => {
  if (isComposing.value) return;

  const selectedResult = searchResults.value[activeResultIndex.value];
  if (selectedResult) {
    void activateSearchResult(selectedResult);
    return;
  }

  submitSearch();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  registerMobileViewportListener();
  loadSearchHistory();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  unregisterMobileViewportListener();
  deactivateModalEnvironment();
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
  gap: 10px;
  min-width: auto;
  height: 36px;
  padding: 0 2px;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    color: var(--text-primary);
    opacity: 0.82;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.search-trigger-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
}

.search-trigger-icon {
  display: block;
}

.search-trigger-sparkle {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 10px;
  height: 10px;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.55) rotate(-75deg);
  transform-origin: center;
  transition:
    opacity 160ms cubic-bezier(0.25, 1, 0.5, 1),
    transform 160ms cubic-bezier(0.25, 1, 0.5, 1);
}

.search-trigger:focus-visible .search-trigger-sparkle {
  opacity: 1;
  transform: scale(1) rotate(0deg);
  transition-duration: 220ms;
}

.search-shortcut {
  min-width: auto;
  padding: 0;
  border: 0;
  font-family: MapleMono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  background: transparent;
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
  &:focus-within {
    border-bottom-color: color-mix(in srgb, var(--el-color-primary) 72%, transparent);
    box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--el-color-primary) 48%, transparent);
  }
}

.search-input-icon {
  color: var(--el-color-primary);
}

.search-dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--text-secondary);
  background: transparent;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
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
  text-decoration: none;
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

.search-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  color: var(--el-color-danger);
  font-size: 14px;
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

.search-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

@media (hover: hover) and (pointer: fine) {
  .search-trigger:hover .search-trigger-sparkle {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    transition-duration: 220ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-trigger,
  .search-dialog-close,
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

  .search-trigger-sparkle {
    transform: scale(1) rotate(0deg);
    transition: none;
  }
}

@media (max-width: 768px) {
  .search {
    flex: 0 0 auto;
    width: auto;
    justify-content: flex-start;
  }

  .search-shortcut {
    display: none;
  }

  .search-trigger {
    min-width: 3.667rem;
    width: 3.667rem;
    height: 3.667rem;
    padding: 0;
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
    padding:
      max(16px, env(safe-area-inset-top))
      max(16px, env(safe-area-inset-right))
      14px
      max(16px, env(safe-area-inset-left));
    grid-template-columns: 26px minmax(0, 1fr) 3.667rem;
  }

  .search-input {
    height: 40px;
    font-size: 1.5rem;
  }

  .search-dialog-close {
    width: 3.667rem;
    height: 3.667rem;
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
