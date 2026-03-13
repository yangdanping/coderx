<template>
  <div class="home-swpier">
    <el-carousel :interval="4000" type="card" height="400px">
      <el-carousel-item v-for="(item, index) in news" :key="index">
        <div class="item">
          <a class="disc" :href="item.url" target="_blank">
            <h2 class="title">{{ item.title }}</h2>
            <h3 class="author">
              来源: {{ item.source.name }} <el-icon size="30px"><ChevronRight /></el-icon>
            </h3>
          </a>
          <img class="cover" role="button" :src="item.urlToImage" alt="" loading="lazy" />
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script lang="ts" setup>
import { ChevronRight } from 'lucide-vue-next';
const { news = [] } = defineProps<{
  news?: any[];
}>();
</script>

<style lang="scss" scoped>
.home-swpier {
  .el-carousel__item {
    border-radius: 6px;
    opacity: 0.2;
    &.is-active {
      opacity: 1;
    }
  }

  :deep(.el-carousel__mask) {
    display: none;
  }
  .item {
    position: relative;
    .disc {
      position: absolute;
      z-index: 1; // 确保文字在图片上方
      top: 0;
      bottom: 0;
      left: 0;
      width: 35%;
      box-sizing: border-box;
      color: #fff;
      padding: 10px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 20px;
      transition: transform 0.5s;
      .title {
        font-size: 18px;
        line-height: 1.5;
      }
      .author {
        display: flex;
        align-items: center;
      }
      &:hover {
        text-shadow: 0px 2px 10px rgb(255, 255, 255, 0.5);
      }
    }
    .cover {
      object-fit: cover;
      width: 100%;
      height: 400px;
      transition: transform 8s cubic-bezier(0.25, 0.46, 0.45, 0.94); // 增加平滑过渡效果
    }

    &:hover {
      .cover {
        transform: scale(1.3); // 悬停时缓慢放大
      }
    }
  }
}
</style>
