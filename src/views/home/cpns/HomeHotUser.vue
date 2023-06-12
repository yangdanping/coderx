<template>
  <div class="home-hot-user">
    <h1>热门作者</h1>
    <div class="scroll-user">
      <ScrollView :data="hotUsers">
        <template #scrollItems="slotProps">
          <HomeHotUserItem v-for="item in slotProps.data" :key="item.id" :item="item" />
        </template>
      </ScrollView>
    </div>
  </div>
</template>

<script lang="ts" setup>
import HomeHotUserItem from './HomeHotUserItem.vue';
import ScrollView from '@/components/scroll-view/ScrollView.vue';
const props = defineProps({
  hotUsers: {
    type: Array as PropType<any[]>,
    default: () => []
  }
});
</script>

<style lang="scss" scoped>
.scroll-user {
  margin: 20px 0;
}
</style>
