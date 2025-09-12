<template>
  <div class="search">
    <el-input
      ref="ElInputRef"
      v-model="searchValue"
      @input="debounceInput"
      @keyup.enter="submitSearch"
      :style="{ width: widerStyle }"
      placeholder="Search CoderX"
      :prefix-icon="Search"
      clearable
      size="large"
    />
    <el-card v-if="isShowResultCard" class="search-card" ref="ElCardRef" :style="{ width: widerStyle }">
      <template v-if="searchHistory.length" #header>
        <span class="header-title">搜索记录:</span>
        <el-button v-if="searchHistory.length" type="text" size="small" @click="clearAllHistory" class="clear-btn"> 清空 </el-button>
      </template>
      <!-- 搜索记录-------------------------------- -->
      <div v-if="searchHistory.length" class="history-content">
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
          <el-icon class="delete-icon" v-show="hoveredIndex === index" @click.stop="removeHistoryItem(item)"> <Close /> </el-icon>
        </div>
      </div>
      <!-- 搜索结果-------------------------------- -->
      <div v-if="searchValue" class="search-result-content" :class="{ showborder: searchResults.length && searchHistory.length }">
        <template v-if="!isSearchLoading">
          <template v-if="searchResults.length">
            <a v-for="item in searchResults" :href="item.articleUrl" :key="item.id" target="_blank" @click="handleSearchResultClick(item.title)">
              <div class="search-item" v-html="highlightText(item.title, searchValue)"></div>
            </a>
          </template>
          <div v-else class="no-data-text">未搜索到相关内容</div>
        </template>
        <div v-else class="loading" v-loading="isSearchLoading"></div>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Search, Close } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

import useRootStore from '@/stores';
import useArticleStore from '@/stores/article';
import { debounce, emitter } from '@/utils';
import LocalCache from '@/utils/LocalCache';

const rootStore = useRootStore();
const articleStore = useArticleStore();
const { searchResults } = storeToRefs(articleStore);

import useLoadingStore from '@/stores/loading';
const loadingKey = 'search';
const loadingStore = useLoadingStore();
const isSearchLoading = computed(() => loadingStore.isLoading(loadingKey));

const ElInputRef = ref();
const ElCardRef = ref();
const searchValue = ref('');
const isShowResultCard = ref(false);
// const showLoading = ref(false);
const router = useRouter();
const route = useRoute();

// 搜索记录相关
const searchHistory = ref<string[]>([]);
const hoveredIndex = ref(-1);

const borderColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#ff6b9d', '#9c27b0', '#00bcd4', '#ff9800', '#795548'];
const getItemStyle = computed(() => {
  return (index: number) => {
    const colorIndex = index % borderColors.length;
    const color = borderColors[colorIndex];
    return { borderColor: color, color: color };
  };
});

const widerStyle = computed(() => {
  return isShowResultCard.value ? '330px' : '240px';
});

const windowHandleClick = (e) => {
  // 检查点击的元素是否在搜索相关区域内
  const inputEl = ElInputRef.value?.$el;
  const searchResultBox = ElCardRef.value?.$el;

  const isClickInput = inputEl?.contains(e.target);
  const isClickSearchResultBox = searchResultBox?.contains(e.target);
  // 判断点击是否在搜索输入框区域
  isShowResultCard.value = (isClickInput || isClickSearchResultBox) && (searchValue.value || searchHistory.value.length);
  // console.log('isShowResultCard=========', isShowResultCard.value);
};
const typinglagTime = 500;

onMounted(() => {
  window.addEventListener('click', windowHandleClick, true);
  // 组件挂载时加载搜索记录
  loadSearchHistory();
});
onBeforeUnmount(() => {
  window.removeEventListener('click', windowHandleClick, true);
});

const submitSearch = () => {
  if (searchValue.value) {
    // 保存搜索记录
    LocalCache.addSearchHistory(searchValue.value);
    loadSearchHistory();
    rootStore.changeTag('');
    if (route.path !== '/article') {
      const routeData = router.resolve({
        path: '/article',
        query: { searchValue: searchValue.value },
      });
      console.log('在其他页面,进行跳转,在跳转页面中请求', routeData);
      window.open(routeData.href, '_blank');
    } else {
      console.log('在文章列表页面,直接在当前页面中请求');
      articleStore.getArticleListAction('', [], searchValue.value);
    }
    emitter.emit('submitSearchValue', searchValue.value);
  }
};

const debounceInput = debounce(() => {
  searchValue.value && articleStore.searchAction(searchValue.value, loadingKey);
}, typinglagTime);

// 搜索记录相关方法
const loadSearchHistory = () => {
  searchHistory.value = LocalCache.getSearchHistory();
};

const selectHistoryItem = (value: string) => {
  searchValue.value = value;
  submitSearch();
  articleStore.searchAction(searchValue.value, 'search');
};

const removeHistoryItem = (item: string) => {
  LocalCache.removeSearchHistory(item);
  loadSearchHistory();
};

const clearAllHistory = () => {
  LocalCache.clearSearchHistory();
  loadSearchHistory();
};

const handleSearchResultClick = (title: string) => {
  LocalCache.addSearchHistory(title);
  loadSearchHistory();
};

// 高亮匹配文本的函数
const highlightText = computed(() => {
  return (text: string, searchValue: string) => {
    if (!searchValue || !text) return text;
    // 简单的不区分大小写替换
    const regex = new RegExp(searchValue, 'gi');
    return text.replace(regex, '<strong>$&</strong>');
  };
});

watch(
  () => searchValue.value,
  (newV) => {
    if (!newV) {
      searchResults.value = []; //清空搜索结果
      isShowResultCard.value = false;
    } else {
      isShowResultCard.value = true;
    }
  },
);

// 控制showLoading的出现-----------------------------
// watch(
//   () => searchResults.value,
//   (newV) => {
//     !newV.length && setTimeout(() => (showLoading.value = false), 2500);
//   },
// );
</script>

<style lang="scss" scoped>
$searchWidth: 260px;

.search {
  margin: 0 30px;
  position: relative;
  :deep(.el-input) {
    border-radius: 5px;
    transition: all 0.3s;
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
    transition: all 0.3s;
    z-index: 99;

    // 搜索记录面板样式
    .history-content {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-bottom: 5pt;
      .history-item {
        position: relative;
        display: inline-flex;
        align-items: center;
        max-width: 90px; // 原需求要求30px，但考虑用户体验，设置为130px以显示更多文本内容
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
        margin-top: 30px;
      }
    }
  }
}
</style>
