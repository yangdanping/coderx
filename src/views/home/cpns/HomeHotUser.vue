<template>
  <div class="home-hot-user" id="hot-authors">
    <h1 role="button" @click="handleAnchorClick">
      热门作者
      <a href="#hot-authors" class="header-anchor" @click.stop>#</a>
    </h1>
    <div class="scroll-user">
      <ScrollView :data="hotUsers">
        <template #scrollItems="slotProps">
          <HomeHotUserCard v-for="item in slotProps.data" :key="item.id" :item="item" />
        </template>
      </ScrollView>
    </div>
  </div>
</template>

<script lang="ts" setup>
import HomeHotUserCard from './HomeHotUserCard.vue';
import ScrollView from '@/components/scroll-view/ScrollView.vue';

const { hotUsers = [] } = defineProps<{
  hotUsers: any[];
}>();

const handleAnchorClick = () => {
  window.location.hash = 'hot-authors';
};
</script>

<style lang="scss" scoped>
.scroll-user {
  margin: 20px 0;
}
</style>
