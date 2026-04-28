<template>
  <div class="recommends">
    <template v-if="loading">
      <h2 class="title" aria-hidden="true">
        <span class="recommend-skeleton title-skeleton"></span>
        <span class="recommend-skeleton icon-skeleton"></span>
      </h2>
      <ul aria-hidden="true">
        <li v-for="item in skeletonRows" :key="item" class="skeleton-item">
          <span class="recommend-skeleton text-skeleton"></span>
        </li>
      </ul>
    </template>

    <template v-else>
      <h2 class="title">
        <span>推荐文章</span>
        <el-tooltip effect="dark" content="换一批" placement="top">
          <el-icon @click="refresh" :class="{ rotating: isRotating }"><RefreshCcw /></el-icon>
        </el-tooltip>
      </h2>
      <ul>
        <li v-for="item in recommends" :key="item.id">
          <Icon v-if="item.views > 20" type="fire" :showLabel="false" color="red" />
          <a @click="goToArticle(item)">
            {{ item.title }}
          </a>
        </li>
      </ul>
    </template>
  </div>
</template>

<script lang="ts" setup>
import Icon from '@/components/icon/Icon.vue';
import { throttle } from '@/utils';
import useArticleStore from '@/stores/article.store';
import { useRouter } from 'vue-router';
import { RefreshCcw } from 'lucide-vue-next';
import type { IArticle } from '@/stores/types/article.result';

const { recommends = [], loading = false } = defineProps<{
  recommends?: IArticle[];
  loading?: boolean;
}>();

const router = useRouter();
const articleStore = useArticleStore();

const skeletonRows = 6;
const pageNum = ref(1);
const isRotating = ref(false);

const refresh = throttle(function () {
  if (loading) return;

  // 触发旋转动画
  isRotating.value = true;

  // 0.8秒后停止旋转动画
  setTimeout(() => {
    isRotating.value = false;
  }, 800);

  pageNum.value += 1;
  if (pageNum.value > 3) pageNum.value = 1;
  articleStore.getRecommendAction(pageNum.value);
}, 1000);

const goToArticle = (item: IArticle) => {
  const routeUrl = router.resolve({ name: 'detail', params: { articleId: item.id } });
  window.open(routeUrl.href, '_blank');
};
</script>

<style lang="scss" scoped>
.recommends {
  display: flex;
  flex-direction: column;
  .title {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    gap: 4px;

    .el-icon {
      cursor: pointer;
      /* transition: transform 0.3s ease; */

      &.rotating {
        animation: rotate 0.8s linear;
      }
    }
  }
  .recommend-skeleton {
    display: block;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--el-fill-color-light) 25%, var(--el-fill-color) 37%, var(--el-fill-color-light) 63%);
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
  }

  .title-skeleton {
    width: 84px;
    height: 22px;
  }

  .icon-skeleton {
    width: 16px;
    height: 16px;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 2px;
    list-style: none;
    @include thin-border(bottom, #eee);
    padding-bottom: 10px;
    margin-bottom: 10px;
    width: 300px;
  }
  .skeleton-item {
    pointer-events: none;
  }

  .text-skeleton {
    width: 100%;
    height: 18px;
  }

  a {
    white-space: nowrap;
    overflow: hidden;
    padding: 2px 0;
    text-overflow: ellipsis;

    /* padding-bottom: 2px; */
    &:hover {
      color: #409eff;
    }
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
