<template>
  <div class="search" ref="containerRef">
    <el-input
      ref="inputRef"
      v-model="searchValue"
      @focus="handleFocus"
      @keyup.enter="submitSearch"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      :style="{ width: widerStyle }"
      placeholder="Search CoderX"
      :prefix-icon="Search"
      clearable
      size="large"
    />
    <el-card v-show="showCardWithDelay" class="search-card" :style="{ width: widerStyle }">
      <!-- 搜索记录头部 -->
      <template v-if="searchHistory.length && !searchValue" #header>
        <span class="header-title">搜索记录:</span>
        <el-button type="text" size="small" @click="clearAllHistory" class="clear-btn"> 清空 </el-button>
      </template>

      <!-- 搜索记录列表 (仅在无搜索词时显示) -->
      <div v-if="searchHistory.length && !searchValue" class="history-content">
        <div
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-item"
          :style="getItemStyle(index)"
          @click="selectHistoryItem(item)"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = -1"
        >
          <span class="history-text">{{ item }}</span>
          <el-icon class="delete-icon" v-show="hoveredIndex === index" @click.stop="removeHistoryItem(item)">
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 搜索结果列表 -->
      <div v-if="searchValue" class="search-result-content" :class="{ showborder: searchResults?.length && searchHistory.length }">
        <template v-if="!isLoading">
          <template v-if="searchResults?.length">
            <div v-for="item in searchResults" :key="item.id" @click="goToArticle(item)" class="result-item-wrapper">
              <div class="search-item" v-html="highlightText(item.title, searchValue)"></div>
            </div>
          </template>
          <div v-else class="no-data-text">未搜索到相关内容</div>
        </template>
        <div v-else class="loading" v-loading="true"></div>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { useRouter, useRoute } from 'vue-router';
import { Search, Close } from '@element-plus/icons-vue';
import { useQuery } from '@tanstack/vue-query';
import { debounce } from '@/utils';
import LocalCache from '@/utils/LocalCache';
import useRootStore from '@/stores/index.store';
import { search } from '@/service/article/article.request';

// 1. 状态定义
const containerRef = ref<HTMLElement>();
const inputRef = ref();
const searchValue = ref('');
const debouncedSearchValue = ref(''); // 用于触发查询的防抖值
const isFocused = ref(false);
const searchHistory = ref<string[]>([]);
const hoveredIndex = ref(-1);
const isComposing = ref(false); // 追踪输入法状态

const rootStore = useRootStore();
const { isSmallScreen } = storeToRefs(rootStore);
const router = useRouter();
const route = useRoute();

// 从 URL 同步搜索词到输入框（当在 /search 页面时）
watch(
  () => route.query.q,
  (newQ) => {
    if (route.path === '/search' && newQ) {
      searchValue.value = newQ as string;
    }
  },
  { immediate: true },
);

// 防抖更新查询参数
const updateDebouncedValue = debounce(() => {
  debouncedSearchValue.value = searchValue.value;
}, 500);

watch(searchValue, (newVal) => {
  if (!newVal) {
    debouncedSearchValue.value = '';
  } else {
    updateDebouncedValue();
  }
});

// 2. TanStack Query 替换原有的 Store/Loading 逻辑
const { data: searchData, isLoading } = useQuery({
  queryKey: ['search', debouncedSearchValue],
  queryFn: ({ signal }) => search(debouncedSearchValue.value, signal),
  enabled: computed(() => !!debouncedSearchValue.value), // 只有当有搜索值时才查询
  staleTime: 1000 * 60, // 1分钟缓存
  select: (res) => res.data, // 只返回 data 部分
});

const searchResults = computed(() => searchData.value || []);

// 3. 显示逻辑优化
// 点击外部隐藏逻辑
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isFocused.value = false;
  }
};

const handleFocus = () => {
  isFocused.value = true;
};

// 处理macos系统输入法回车键提交搜索的问题
const handleCompositionStart = () => (isComposing.value = true);

const handleCompositionEnd = () => {
  // 使用 setTimeout 延迟重置，确保 keyup.enter 事件能正确检测到输入法状态
  // compositionend 和 keyup.enter 几乎同时触发，需要延迟一点点时间
  setTimeout(() => (isComposing.value = false), 100);
};

// 控制卡片显示：(聚焦状态) && (有搜索内容 OR 有历史记录)
const shouldShowCard = computed(() => {
  const hasContent = !!searchValue.value || searchHistory.value.length > 0;
  return isFocused.value && hasContent;
});

/**
 * 卡片显示延迟控制
 * 目的：让卡片在 input 宽度变化完成后再出现，实现流畅的动画效果
 *
 * showCardWithDelay: 控制卡片最终是否显示（响应式，用于模板渲染）
 * showCardTimer: 延迟定时器 ID（普通变量，不需要响应式）
 *   - 不用 ref() 的原因：
 *     1. 只用于存储定时器 ID，清除定时器时使用
 *     2. 不需要在模板中使用，不需要触发视图更新
 *     3. 使用普通变量更轻量，避免响应式系统的性能开销
 */
const showCardWithDelay = ref(false);
let showCardTimer: number | null = null;

watch(shouldShowCard, (newVal) => {
  if (newVal) {
    // 显示逻辑：小屏幕立即显示，大屏幕延迟 300ms（等待 input 宽度过渡完成）
    if (isSmallScreen.value) {
      showCardWithDelay.value = true;
    } else {
      showCardTimer = window.setTimeout(() => {
        showCardWithDelay.value = true;
      }, 300);
    }
  } else {
    // 隐藏逻辑：无论屏幕大小，都立即隐藏并清除待执行的定时器
    if (showCardTimer) {
      clearTimeout(showCardTimer);
      showCardTimer = null;
    }
    showCardWithDelay.value = false;
  }
});

// 样式计算
const widerStyle = computed(() => {
  const baseWidth = 240;
  if (!isSmallScreen.value) {
    return shouldShowCard.value ? baseWidth + 100 + 'px' : baseWidth + 'px';
  } else {
    return '100%';
  }
});

const borderColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#ff6b9d', '#9c27b0', '#00bcd4', '#ff9800', '#795548'];
const getItemStyle = (index: number) => {
  const color = borderColors[index % borderColors.length];
  return { borderColor: color, color: color };
};

// 4. 搜索记录管理
const loadSearchHistory = () => {
  searchHistory.value = LocalCache.getSearchHistory();
};

const selectHistoryItem = (value: string) => {
  searchValue.value = value;
  // 选中历史记录时，不仅赋值，通常也期望触发搜索或跳转
  // 这里直接触发提交
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

// 5. 提交搜索与跳转
const submitSearch = () => {
  if (isComposing.value) return;
  if (!searchValue.value) return;

  // 保存记录
  LocalCache.addSearchHistory(searchValue.value);
  loadSearchHistory();

  // 隐藏下拉 (失去焦点)
  isFocused.value = false;
  if (inputRef.value) inputRef.value.blur();

  rootStore.changeTag('');

  // 统一跳转到 /search?q=xxx（单页面路由切换）
  router.push({ path: '/search', query: { q: searchValue.value } });
};

const goToArticle = (item: any) => {
  // 记录点击历史
  LocalCache.addSearchHistory(item.title);
  loadSearchHistory();

  const routeUrl = router.resolve({ name: 'detail', params: { articleId: item.id } });
  window.open(routeUrl.href, '_blank');
};

// 6. 工具函数
const highlightText = (text: string, keyword: string) => {
  if (!keyword || !text) return text;
  const regex = new RegExp(keyword, 'gi');
  return text.replace(regex, '<strong>$&</strong>');
};

// 7. 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadSearchHistory();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (showCardTimer) {
    clearTimeout(showCardTimer);
  }
});
</script>

<style lang="scss" scoped>
$searchWidth: 100%;

.search {
  position: relative;

  :deep(.el-input) {
    border-radius: 5px;
    transition: all 0.3s ease;
    height: 36px;
    width: $searchWidth;
    .el-input__wrapper {
      border-radius: 5px;
    }
  }

  :deep(.el-card__body) {
    padding: 5px 10px;
  }

  :deep(.el-card__header) {
    padding: 5px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      color: #ccc;
      font-size: 14px;
    }

    .clear-btn {
      color: #409eff;
      padding: 0;
      &:hover {
        color: #66b1ff;
      }
    }
  }

  .search-card {
    position: absolute;
    top: 39px;
    width: $searchWidth;
    z-index: 999;
    animation: boxDownSimple 0.3s;
    .history-content {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-bottom: 5pt;

      .history-item {
        position: relative;
        display: inline-flex;
        align-items: center;
        max-width: 90px;
        padding: 4px 8px;
        border: 1px solid;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;

        .history-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .delete-icon {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 16px;
          height: 16px;
          background: #c1bbb4;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          cursor: pointer;
          z-index: 1;

          &:hover {
            background: #f78989;
          }
        }

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }

    .search-result-content {
      min-height: 30px;
      &.showborder {
        border-top: 1px solid #ccc;
      }

      .result-item-wrapper {
        cursor: pointer;
      }

      .search-item {
        padding: 10px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        font-size: 14px;

        &:hover {
          color: #03a9f4;
        }

        :deep(strong) {
          background-color: #9de0ff;
          color: #333;
          font-weight: bold;
          padding: 1px 2px;
          border-radius: 2px;
        }
      }

      .no-data-text {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 30px;
        color: #ccc;
        font-size: 14px;
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 60px; /* Fixed height for loading */
      }
    }
  }
}

// 移动端响应式样式
@media (max-width: 768px) {
  .search {
    :deep(.el-input) {
      width: 180px;
    }
  }
}
</style>
