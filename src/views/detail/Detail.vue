<template>
  <div class="detail">
    <NavBar>
      <template #center> <DetailTools :article="article" :isAuthor="isAuthor(userInfo.id)" /></template>
    </NavBar>
    <h2>文章详情</h2>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import NavBar from '@/components/navbar/NavBar.vue';
import DetailTools from './cpns/detail/DetailTools.vue';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const { article, isAuthor } = storeToRefs(useArticleStore());
const { userInfo } = storeToRefs(useUserStore());
</script>

<style lang="scss" scoped></style>
