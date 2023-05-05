<template>
  <div class="user-profile-menu">
    <el-tabs class="user-tabs" v-model="activeName" @tab-click="handleClick">
      <el-tab-pane label="文章" name="文章">
        <UserArticle />
      </el-tab-pane>
      <el-tab-pane label="回答" name="回答">
        <UserComment />
      </el-tab-pane>
      <el-tab-pane label="收藏" name="收藏">
        <UserCollect />
      </el-tab-pane>
      <el-tab-pane label="关注" name="关注">
        <UserFollow />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import UserArticle from './UserArticle.vue';
import UserCollect from './UserCollect.vue';
import UserComment from './UserComment.vue';
import UserFollow from './UserFollow.vue';
const route = useRoute();
const activeName = ref('文章');
const emit = defineEmits(['tabClick']);
watch(
  () => route.params.userId,
  () => (activeName.value = '文章') //切换不同用户时初始化为文章
);
const handleClick = (tab) => emit('tabClick', tab.index);
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
