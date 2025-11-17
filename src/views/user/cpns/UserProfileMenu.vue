<template>
  <div class="user-profile-menu">
    <el-tabs class="user-tabs" v-model="activeName" @tab-click="handleClick">
      <el-tab-pane label="文章" name="文章">
        <UserArticle />
      </el-tab-pane>
      <el-tab-pane label="评论" name="评论">
        <UserComment />
      </el-tab-pane>
      <el-tab-pane label="收藏" name="收藏">
        <UserCollect />
      </el-tab-pane>
      <el-tab-pane label="关注" name="关注">
        <UserFollow />
      </el-tab-pane>
      <!-- 只有登录用户查看自己的空气才有 -->
      <el-tab-pane label="最近浏览" name="最近浏览" v-if="isUser(profile.id)">
        <UserHistory />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import useUserStore from '@/stores/user.store';
import UserArticle from './UserArticle.vue';
import UserCollect from './UserCollect.vue';
import UserComment from './UserComment.vue';
import UserFollow from './UserFollow.vue';
import UserHistory from './UserHistory.vue';
import { emitter } from '@/utils';

const route = useRoute();
const userStore = useUserStore();
const { isUser, profile } = storeToRefs(userStore);
const activeName = ref<any>('文章');
const emit = defineEmits(['tabClick']);

onMounted(() => {
  emitter.on('changeFollowTab', () => {
    activeName.value = '关注';
  });
  const tabName = route.query.tabName;
  console.log('UserProfileMenu onMounted tabName', tabName);
  if (tabName) {
    activeName.value = tabName;
    if (tabName === '收藏') {
      userStore.getCollectAction(userStore.userInfo.id);
    } else if (tabName === '最近浏览') {
      console.log('最近浏览');
    }
  }
});

watch(
  () => route.params.userId,
  () => (activeName.value = '文章'), //切换不同用户时初始化为文章
);
const handleClick = (tab) => emit('tabClick', tab);
</script>

<style lang="scss" scoped>
.user-profile-menu {
  backdrop-filter: blur(10px);
}
.user-tabs {
  :deep(.el-tabs__item) {
    font-size: 20px;
    width: 300px;
    text-align: center;
  }
}
</style>
