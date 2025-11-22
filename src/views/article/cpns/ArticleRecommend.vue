<template>
  <div class="recommends">
    <h2 class="title">
      推荐文章
      <el-tooltip effect="dark" content="换一批" placement="top">
        <el-icon @click="refresh" :class="{ rotating: isRotating }"><IRefresh /></el-icon>
      </el-tooltip>
    </h2>
    <ul>
      <li v-for="item in recommends" :key="item.id">
        <Icon v-if="item.views > 20" type="fire" :showLabel="false" color="red" />
        <a @click="goToArticle(item)" style="cursor: pointer">
          {{ item.title }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import Icon from '@/components/icon/Icon.vue';
import { throttle } from '@/utils';
import useArticleStore from '@/stores/article.store';
import { useRouter } from 'vue-router';

const router = useRouter();
const articleStore = useArticleStore();
const { recommends = [] } = defineProps<{
  recommends?: any[];
}>();
const pageNum = ref(1);
const isRotating = ref(false);

const refresh = throttle(function () {
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

const goToArticle = (item: any) => {
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
    color: var(--fontColor);
    margin-bottom: 10px;

    .el-icon {
      cursor: pointer;
      /* transition: transform 0.3s ease; */

      &.rotating {
        animation: rotate 0.8s linear;
      }
    }
  }
  li {
    display: flex;
    align-items: center;
    list-style: none;
    padding-bottom: 10px;
    border-bottom: 1px solid #ccc;
    margin-bottom: 10px;
    width: 300px;
  }
  a {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline;
    &:hover {
      color: #409eff;
    }
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
