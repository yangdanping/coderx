<template>
  <div class="user-follow">
    <el-tabs class="follow-tabs" v-model="followType" @tab-click="handleClick" @tabChange="handleChange">
      <el-tab-pane :label="`${sex}的关注`" name="following">
        <UserFollowItem v-if="followInfo[followType]?.length" :userFollow="followInfo[followType]" :followType="followType" />
        <template v-else> <span>这个人很高冷,没有关注别人</span></template>
      </el-tab-pane>
      <el-tab-pane :label="`${sex}的粉丝`" name="follower">
        <UserFollowItem v-if="followInfo[followType]?.length" :userFollow="followInfo[followType]" :followType="followType" />
        <template v-else> <span>这个人还没有被别人关注过~</span></template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import UserFollowItem from './UserFollowItem.vue';

import useUserStore from '@/stores/user.store';
const userStore = useUserStore();
const { profile, followInfo } = storeToRefs(userStore);

const followType = ref<any>('following@'); //默认显示关注者
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
const route = useRoute();

onMounted(() => {
  emitter.on('changeFollowTab ', (subTabName) => {
    followType.value = subTabName;
  });
  const { tabName, subTabName } = route.query;
  console.log('UserFollow onMounted', tabName, subTabName);
  if (subTabName) {
    followType.value = subTabName;
  }
});

const handleClick = (pane) => {
  console.log('handleClick', pane.paneName);
};
const handleChange = (activeName) => {
  console.log('handleChange', activeName);
};
</script>

<style lang="scss" scoped>
:deep(.el-tabs__item) {
  font-size: 20px;
  width: 100px !important;
  text-align: center;
}
</style>
