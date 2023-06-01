<template>
  <div class="home-swpier">
    <h1 class="swiper-title">热门新闻</h1>
    <el-carousel :interval="4000" type="card" height="500px">
      <el-carousel-item v-for="(item, index) in news" :key="index">
        <div class="item">
          <a class="disc" :href="item.url" target="_blank">
            <h2 class="author">{{ item.source.name }}</h2>
            <h3 class="title">{{ item.title }}</h3>
            <el-icon size="30px"><IArrowRight /></el-icon>
          </a>
          <img class="cover" :src="item.image" alt="" loading="lazy" />
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps({
  news: {
    type: Array as PropType<any[]>,
    default: () => []
  }
});
</script>

<style lang="scss" scoped>
.home-swpier {
  .swiper-title {
    margin-bottom: 20px;
  }
  .el-carousel__item {
    border-radius: 10px;
  }
  .item {
    position: relative;
    .disc {
      position: absolute;
      bottom: 20px;
      right: 0;
      left: 0;
      color: #fff;
      padding: 20px;
      background: rgba(0, 0, 0, 0.7);
      transition: transform 0.5s;
      .el-icon {
        position: absolute;
        top: 20px;
        right: 20px;
        transition: transform 0.5s;
      }
      &:hover {
        text-shadow: 0px 2px 10px rgb(255, 255, 255);
        .el-icon {
          transform: scale(1.3);
        }
      }
      .title {
        margin-top: 30px;
      }
    }
    .cover {
      object-fit: cover;
      width: 100%;
      height: 500px;
    }
  }
}
</style>
