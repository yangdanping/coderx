<template>
  <div class="recommends">
    <h2 class="title">
      推荐文章
      <el-tooltip effect="dark" content="换一批" placement="top">
        <el-icon @click="refresh"><IRefresh /></el-icon>
      </el-tooltip>
    </h2>
    <ul>
      <li v-for="item in recommends" :key="item.id">
        <Icon v-if="item.views > 20" type="fire" color="red" />
        <a :href="item.articleUrl" target="_blank">
          {{ item.title }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import Icon from '@/components/icon/Icon.vue';
import { throttle } from '@/utils';
import useArticleStore from '@/stores/article';
const articleStore = useArticleStore();
const props = defineProps({
  recommends: {
    type: Array as PropType<any[]>,
    default: () => {}
  }
});
const offset = ref(0);
const refresh = throttle(function () {
  offset.value += 10;
  if (offset.value > 10) offset.value = 0;
  articleStore.getRecommendAction(offset.value);
}, 1000);
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
</style>
