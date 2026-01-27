<template>
  <div class="hot-user-card-item">
    <div class="user">
      <Avatar :info="item" :size="60" />
      <h3 class="name">{{ item.name }}</h3>
    </div>
    <img class="bg" :src="item.avatarUrl" alt="" />
    <div class="bg-mask"></div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';

const { item = {} } = defineProps<{
  item: any;
}>();
</script>

<style lang="scss" scoped>
$borderRadius: 28px;

.hot-user-card-item {
  box-sizing: border-box;
  flex-basis: calc(100% * 1 / 4); //指在flex布局中给flex设置最小宽度
  flex-shrink: 0; //flex-shrink默认为1,默认就会对图片做压缩
  background: #eee;
  text-align: center;
  margin-right: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  /* width: 25%; */
  height: 200px;
  @include glass-effect;
  border: 1px solid rgba(216, 216, 216);
  border-radius: $borderRadius;
  transition: all 0.3s;
  &:last-child {
    margin-right: 0;
  }

  .bg,
  .bg-mask {
    opacity: 0;
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    z-index: var(--z-below);
    transition: all 0.3s;
    overflow: hidden;
    border-radius: $borderRadius;
  }
  .bg-mask {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: var(--glass-blur);
  }

  .bg {
    object-fit: cover;
  }
  &:hover {
    // box-shadow: 0px 2px 8px rgba(100, 100, 100, 0.7);
    color: #fff;
    .bg,
    .bg-mask {
      opacity: 1;
    }
  }
}
</style>
