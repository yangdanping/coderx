<template>
  <div class="home-hot-user">
    <div class="scroll-user">
      <ScrollView :data="hotUsers">
        <template #scrollItems="slotProps">
          <HomeHotUserCard v-for="item in slotProps.data" :key="item.id" :item="item" :quote="getHotUserTestimonial(item)" />
        </template>
      </ScrollView>
    </div>
  </div>
</template>

<script lang="ts" setup>
import HomeHotUserCard from './HomeHotUserCard.vue';
import ScrollView from '@/components/scroll-view/ScrollView.vue';
import type { IUserInfo } from '@/stores/types/user.result';

const { hotUsers = [] } = defineProps<{
  hotUsers: IUserInfo[];
}>();

const hotUserTestimonials: Record<string, string> = {
  ydp: '我希望这里不只是发布文章，而是让想法从草稿、讨论到沉淀都有一条清晰的路径。',
  daniel: '目录和 AI 助手让我能很快抓住重点，也愿意沿着一个好问题继续读下去。',
  neo: '编辑器没有打断创作节奏，Markdown、智能续写和即时预览都出现在刚好的时机。',
};

const getHotUserTestimonial = (user: IUserInfo) => {
  const accountName = user.name?.trim().toLowerCase() ?? '';
  return hotUserTestimonials[accountName] ?? '在这里，阅读、讨论和创作自然地连在了一起。';
};
</script>

<style lang="scss" scoped>
.scroll-user {
  margin: 20px 0;
}
</style>
