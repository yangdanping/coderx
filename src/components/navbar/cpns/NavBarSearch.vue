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
              <LoaderCircle v-if="isLoading && normalizedDebouncedSearchValue" class="search-loading-icon" :size="22" aria-hidden="true" />
              <Search v-else class="search-input-icon" :size="22" aria-hidden="true" />
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
              <button v-if="searchValue" type="button" class="search-input-clear" aria-label="清空搜索输入" @click="clearSearchInput">
                <X :size="19" aria-hidden="true" />
              </button>
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
                <div v-else class="loading">正在搜索…</div>
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
            <footer class="search-footer" aria-hidden="true">
              <span class="search-footer-hint"><kbd>↵</kbd> 选择</span>
              <span class="search-footer-hint"><kbd>↑</kbd><kbd>↓</kbd> 切换</span>
              <span class="search-footer-hint"><kbd>Esc</kbd> 关闭</span>
            </footer>
            <p class="search-status" role="status" aria-live="polite" aria-atomic="true">{{ searchStatusText }}</p>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { LoaderCircle, Search, X } from '@lucide/vue';
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

const clearSearchInput = async () => {
  searchValue.value = '';
  debouncedSearchValue.value = '';
  activeResultIndex.value = -1;
  await nextTick();
  searchInput.value?.focus();
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
  padding: calc(var(--navbarHeight) + 24px) 16px 24px;
  background: color-mix(in srgb, var(--text-primary) 14%, rgba(14, 18, 26, 0.42));
  backdrop-filter: blur(3px);
  overscroll-behavior: contain;
}

.search-dialog {
  display: flex;
  flex-direction: column;
  width: min(640px, 100%);
  max-height: min(70dvh, 560px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border-color-default) 82%, var(--el-color-primary) 18%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--glass-bg-popup) 97%, var(--bg-color-primary));
  overscroll-behavior: contain;
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.18);
}

.search-input-shell {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color-list) 86%, transparent);
  transition:
    border-color 180ms cubic-bezier(0.25, 1, 0.5, 1),
    box-shadow 180ms cubic-bezier(0.25, 1, 0.5, 1);

  &:focus-within {
    border-bottom-color: color-mix(in srgb, var(--el-color-primary) 76%, transparent);
    box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--el-color-primary) 44%, transparent);
  }
}

.search-input-icon,
.search-loading-icon {
  color: var(--el-color-primary);
}

.search-loading-icon {
  animation: search-spin 800ms linear infinite;
}

.search-input-clear,
.search-dialog-close {
  display: inline-flex;
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
    outline-offset: -2px;
  }
}

.search-input {
  min-width: 0;
  height: 40px;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: 0;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.86;
  }
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 12px 14px 14px;

  &:empty {
    display: none;
  }
}

.search-result-content {
  flex: 0 0 auto;
}

.search-result-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-result-option {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
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
  transition:
    color 160ms cubic-bezier(0.25, 1, 0.5, 1),
    background-color 160ms cubic-bezier(0.25, 1, 0.5, 1);

  &:hover,
  &.is-active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--el-color-primary) 15%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
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
  color: var(--el-color-primary);
  font-weight: 700;
}

.no-data-text {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  color: var(--text-secondary);
  font-size: 14px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  color: var(--text-secondary);
  font-size: 13px;
}

.search-history-section,
.favorite-history-section {
  flex: 0 0 auto;
}

.search-history-section + .favorite-history-section,
.search-result-content + .search-history-section,
.search-result-content + .favorite-history-section {
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--border-color-list) 82%, transparent);
}

.search-footer {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 38px;
  padding: 6px 14px;
  border-top: 1px solid color-mix(in srgb, var(--border-color-list) 82%, transparent);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-color-secondary) 54%, transparent);
  font-size: 12px;
}

.search-footer-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.search-footer kbd {
  min-width: 20px;
  padding: 2px 4px;
  border: 0;
  border-radius: 4px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
  font-family: MapleMono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.25;
  text-align: center;
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

@keyframes search-spin {
  to {
    transform: rotate(1turn);
  }
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
  .search-input-shell,
  .search-input-clear,
  .search-dialog-close,
  .search-result-option,
  .search-overlay-enter-active,
  .search-overlay-leave-active,
  .search-overlay-enter-active .search-dialog,
  .search-overlay-leave-active .search-dialog {
    transition: none;
  }

  .search-trigger:hover,
  .search-overlay-enter-from .search-dialog,
  .search-overlay-leave-to .search-dialog {
    transform: none;
  }

  .search-trigger-sparkle {
    transform: scale(1) rotate(0deg);
    transition: none;
  }

  .search-loading-icon {
    animation: none;
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
    display: flex;
    align-items: flex-start;
    overflow: hidden;
    padding:
      max(12px, env(safe-area-inset-top))
      max(12px, env(safe-area-inset-right))
      max(12px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
  }

  .search-dialog {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
    border-radius: 12px;
  }

  .search-input-shell {
    padding:
      10px
      max(12px, env(safe-area-inset-right))
      10px
      max(12px, env(safe-area-inset-left));
    grid-template-columns: 24px minmax(0, 1fr) auto auto;
    gap: 6px;
  }

  .search-input {
    height: 40px;
    font-size: 1rem;
  }

  .search-dialog-close {
    width: 3.667rem;
    height: 3.667rem;
  }

  .search-panel {
    padding: 10px 12px 12px;
  }

  .search-footer {
    flex-wrap: wrap;
    gap: 8px 14px;
    padding:
      7px
      max(12px, env(safe-area-inset-right))
      max(7px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
  }
}
</style>
