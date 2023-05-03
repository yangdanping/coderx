<template>
  <div class="user-profile-menu">
    <el-tabs class="user-tabs" v-model="activeName" @tab-click="handleClick">
      <el-tab-pane label="文章" name="1">
        <UserArticle />
      </el-tab-pane>
      <el-tab-pane label="回答" name="2"> 回答 </el-tab-pane>
      <el-tab-pane label="收藏" name="3"> 收藏 </el-tab-pane>
      <el-tab-pane label="关注" name="4">
        <UserFollow />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import UserArticle from './UserArticle.vue';
import UserFollow from './UserFollow.vue';
const activeName = ref('1');
const emit = defineEmits(['tabClick']);
const handleClick = (tab) => {
  emit('tabClick', tab.index);
};
</script>

<style lang="scss" scoped>
.user-tabs {
  :deep(.el-tabs__item) {
    font-size: 20px;
    width: 300px;
    text-align: center;
  }
}
</style>
