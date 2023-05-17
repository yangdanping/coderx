<template>
  <div class="right">
    <div class="search">
      <el-input v-model="searchValue" @input="debounceInput" placeholder="Search CoderX" :prefix-icon="Search" clearable size="large" />
      <div class="search-box">
        <el-card class="box-card" v-if="searchValue">
          <template #header>
            <span style="color: #ccc">搜索:"{{ searchValue }}"</span>
          </template>
          <div v-if="!searchResults.length">
            <div v-if="!searchResults.length && showLoading" class="loading" v-loading="!searchResults.length && showLoading"></div>
            <div v-else style="color: #ccc">暂无该内容</div>
          </div>
          <template v-if="searchResults.length">
            <a v-for="item in searchResults" :href="item.articleUrl" :key="item.id">
              <div class="search-item">{{ item.title }}</div>
            </a>
          </template>
        </el-card>
      </div>
    </div>

    <template v-if="!token">
      <el-button @click="changeDialog" class="register-btn">Hello CoderX</el-button>
    </template>
    <template v-else>
      <NavBarUser />
    </template>
  </div>
</template>

<script lang="ts" setup>
import NavBarUser from './NavBarUser.vue';
import { Search } from '@element-plus/icons-vue';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import { debounce } from '@/utils';
const rootStore = useRootStore();
const articleStore = useArticleStore();
const { token } = storeToRefs(useUserStore());
const { searchResults } = storeToRefs(articleStore);
const searchValue = ref('');

const debounceInput = debounce(function () {
  if (searchValue.value) {
    articleStore.searchAction(searchValue.value);
  }
}, 1000);

const showLoading = ref(false);

watch(
  () => searchValue.value,
  (newV) => {
    if (!newV) {
      searchResults.value = []; //清空搜索结果
      showLoading.value = false;
    } else {
      showLoading.value = true;
    }
  }
);
watch(
  () => searchResults.value,
  (newV) => {
    if (!newV.length) {
      setTimeout(() => {
        showLoading.value = false;
      }, 1000);
    }
  }
);

const changeDialog = () => {
  console.log('open Dialog');
  rootStore.changeLoginDialog();
};
</script>

<style lang="scss" scoped>
$searchWidth: 250px;
.right {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100px;
  margin-right: 200px;
  .search {
    margin-right: 30px;
    :deep(.el-input) {
      border-radius: 30px;
      width: $searchWidth;
    }
    .search-box {
      position: relative;
      .box-card {
        position: absolute;
        bottom: 70;
        width: $searchWidth;
        z-index: 99;
        .loading {
          padding: 10px 0;
        }

        .search-item {
          padding: 10px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          &:hover {
            color: #03a9f4;
          }
        }
      }
    }
  }
  .register-btn {
    position: relative;
    color: #fff;
    /* font-size: 16px; */
    background: linear-gradient(90deg, #afffe3, #f888c8, #ffeb3b, #43c3ff);
    background-size: 400%;
    transition: all 0.3s;
    z-index: 1;
  }
  .register-btn::before {
    content: '';
    position: absolute;
    left: -5px;
    right: -5px;
    top: -5px;
    bottom: -5px;
    background: linear-gradient(90deg, #afffe3, #f888c8, #ffeb3b, #43c3ff);
    background-size: 400%;
    filter: blur(15px);
    z-index: -1;
  }
  .register-btn:hover {
    text-shadow: 0px 2px 10px rgb(255, 255, 255);
    animation: flow 3s infinite;
    transform: scale(1.2);
  }
  .register-btn:hover ::before {
    animation: flow 3s infinite;
  }
}
</style>
