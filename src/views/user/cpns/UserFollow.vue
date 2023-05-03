<template>
  <div class="user-follow">
    <el-tabs class="follow-tabs" v-model="followType">
      <el-tab-pane :label="`${sex}的关注`" name="following">
        <UserFollowItem v-if="followInfo.following?.length" :userFollow="followInfo.following" followType="following" />
        <template v-else> <span>这个人很高冷,没有关注别人</span></template>
      </el-tab-pane>
      <el-tab-pane :label="`${sex}的粉丝`" name="follower">
        <UserFollowItem v-if="followInfo.follower?.length" :userFollow="followInfo.follower" followType="follower" />
        <template v-else> <span>这个人还没有被别人关注过~</span></template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import UserFollowItem from './UserFollowItem.vue';

import useUserStore from '@/stores/user';
const userStore = useUserStore();
const { profile, followInfo } = storeToRefs(userStore);

const followType = ref('following');
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
</script>

<style lang="scss" scoped>
:deep(.el-tabs__item) {
  font-size: 20px;
  width: 100px !important;
  text-align: center;
}
</style>
