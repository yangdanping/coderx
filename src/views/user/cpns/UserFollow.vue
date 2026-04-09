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
import UserFollowItem from './UserFollowItem.vue';
import Tabs from '@/components/common/Tabs.vue';
import TabItem from '@/components/common/TabItem.vue';
import useUserStore from '@/stores/user.store';

type FollowTabName = 'following' | 'follower';

const { profile, followInfo } = storeToRefs(useUserStore());

const router = useRouter();
const route = useRoute();

const followType = ref<FollowTabName>('following'); //默认显示关注者
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));

function normalizeFollowType(subTabName?: FollowTabName): FollowTabName {
  return subTabName === 'follower' ? 'follower' : 'following';
}

watch(
  () => route.query.subTabName,
  (subTabName) => {
    followType.value = normalizeFollowType(subTabName as FollowTabName);
  },
  { immediate: true },
);

const handleClick = (name: FollowTabName) => {
  const nextFollowType = normalizeFollowType(name);
  if (route.query.subTabName === nextFollowType) return;
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tabName: '关注',
      subTabName: nextFollowType,
    },
  });
};
</script>

<style lang="scss" scoped>
.user-follow {
  .content {
    margin-top: 20px;
  }
}
</style>
