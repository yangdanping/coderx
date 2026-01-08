<template>
  <div class="user-profile-menu">
    <UserArticle v-if="activeName === '文章'" />
    <UserComment v-if="activeName === '评论'" />
    <UserCollect v-if="activeName === '收藏'" />
    <UserFollow v-if="activeName === '关注'" />
    <!-- 只有登录用户才可以查看自己的浏览历史 -->
    <UserHistory v-if="activeName === '最近浏览' && isMe" />
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import useUserStore from '@/stores/user.store';
import { useAuth } from '@/composables/useAuth';
import UserArticle from './UserArticle.vue';
import UserCollect from './UserCollect.vue';
import UserComment from './UserComment.vue';
import UserFollow from './UserFollow.vue';
import UserHistory from './UserHistory.vue';

const props = defineProps<{
  activeName: string;
}>();

const userStore = useUserStore();
const { isCurrentUser } = useAuth();
const { profile } = storeToRefs(userStore);

// 判断是否为当前登录用户（用于控制"最近浏览"组件显示）
const isMe = computed(() => isCurrentUser(profile.value.id));
</script>

<style lang="scss" scoped>
.user-profile-menu {
  width: 100%;
  margin-top: 10px;
  // backdrop-filter: blur(10px); // Moved to parent or handled by layout
}
</style>
