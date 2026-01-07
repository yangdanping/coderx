<template>
  <div class="user-follow">
    <Tabs class="follow-tabs" v-model="followType" direction="horizontal" @tab-click="handleClick">
      <TabItem name="following" :label="`${sex}的关注`" />
      <TabItem name="follower" :label="`${sex}的粉丝`" />
    </Tabs>
    <div class="content">
      <template v-if="followType === 'following'">
        <UserFollowItem v-if="followInfo[followType]?.length" :userFollow="followInfo[followType]" :followType="followType" />
        <template v-else> <span>这个人很高冷,没有关注别人</span></template>
      </template>
      <template v-else-if="followType === 'follower'">
        <UserFollowItem v-if="followInfo[followType]?.length" :userFollow="followInfo[followType]" :followType="followType" />
        <template v-else> <span>这个人还没有被别人关注过~</span></template>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import UserFollowItem from './UserFollowItem.vue';
import Tabs from '@/components/common/Tabs.vue';
import TabItem from '@/components/common/TabItem.vue';

import useUserStore from '@/stores/user.store';
const userStore = useUserStore();
const { profile, followInfo } = storeToRefs(userStore);

const followType = ref<any>('following'); //默认显示关注者
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
const route = useRoute();

onMounted(() => {
  emitter.on('changeFollowTab', (subTabName) => {
    followType.value = subTabName;
  });
  const { tabName, subTabName } = route.query;
  console.log('UserFollow onMounted', tabName, subTabName);
  if (subTabName) {
    followType.value = subTabName;
  }
});

const handleClick = (name) => {
  console.log('handleClick', name);
};
</script>

<style lang="scss" scoped>
.user-follow {
  .content {
    margin-top: 20px;
  }
}
</style>
