<template>
  <div class="user-profile">
    <div class="profile-header">
      <UserAvatar :info="profile" />
      <div class="profile-info">
        <div class="profile-1">
          <span class="name">{{ profile.name }}</span>
          <img :src="userSex" alt="" />
          <template v-if="isUser(profile.id)">
            <el-tooltip effect="dark" content="修改个人信息" placement="bottom">
              <el-icon @click="updateProfile" class="edit" size="30" color="#909399"> <IEdit /> </el-icon>
            </el-tooltip>
          </template>
        </div>
        <div class="profile-2">
          <el-icon><ICoin /></el-icon>
          <span>年龄:{{ profile.age ?? '无' }}</span>
        </div>
        <div class="profile-3">
          <el-icon><ISuitcase /></el-icon>
          <span>职业:{{ profile.career ?? 'Coder' }}</span>
        </div>
        <div class="profile-4">
          <el-icon><ICoordinate /></el-icon>
          <span>居住地:{{ profile.address ?? 'CoderX星球' }}</span>
        </div>
        <div class="profile-5">
          <el-icon><ITakeawayBox /></el-icon>
          <span>邮箱:{{ profile.email ?? '无' }}</span>
        </div>
      </div>
      <div class="profile-right">
        <div>
          <div>
            <div>关注数</div>
            <div>{{ followCount('following') }}</div>
          </div>
          <div>
            <div>粉丝数</div>
            <div>{{ followCount('follower') }}</div>
          </div>
        </div>
        <FollowButton :isFollowed="isFollowed" :profile="props.profile" />
      </div>
    </div>
    <div class="profile-main">
      <UserProfileMenu @tabClick="tabClick" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from './UserAvatar.vue';
import UserProfileMenu from './UserProfileMenu.vue';
import FollowButton from '@/components/FollowButton.vue';
import { emitter, getImageUrl } from '@/utils';

import type { IUserInfo } from '@/stores/types/user.result';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
const rootStore = useRootStore();
const userStore = useUserStore();
const { isFollowed, isUser, followInfo } = storeToRefs(userStore);

const props = defineProps({
  profile: {
    type: Object as PropType<IUserInfo>,
    default: () => {}
  }
});

const followCount = computed(() => {
  return (type: string) => followInfo.value[type]?.length ?? 0;
});

const userSex = computed(() => getImageUrl('user', `${props.profile.sex === '女' ? 'female' : 'male'}-icon`));

const route = useRoute();

const updateProfile = () => {
  rootStore.changeLoginDialog();
  emitter.emit('updateProfile', JSON.parse(JSON.stringify(props.profile))); //深拷贝
};

const tabClick = (index) => {
  const userId = props.profile.id;
  console.log('tabClick', userId, index);
  switch (index) {
    case '0':
      userStore.getProfileAction(route.params.userId);
      break;
    case '1':
      userStore.getCommentAction(userId);
      break;
    case '2':
      userStore.getCollectAction(userId);
      break;
    case '3':
      emitter.emit('updateFollowList');
      userStore.getFollowAction(userId);
      break;
    default:
      break;
  }
};
</script>

<style lang="scss" scoped>
.user-profile {
  margin-top: 80px;
  // height: 100vh;//高度是个坑!!!不要设置高度!!!
  width: 60%;
  .profile-header,
  .profile-main {
    display: flex;
  }
  .profile-header {
    position: relative;
    display: flex;
    align-items: center;

    .profile-info {
      flex: 1;
      display: flex;
      flex-direction: column;

      margin: 0 0 0 30px;
      .name {
        font-weight: 700;
        font-size: 35px;
      }
      .edit {
        cursor: pointer;
        margin-top: 5px;
      }
      [class^='profile-'] {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        font-size: 25px;
      }
    }
    .profile-right {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      > div {
        /* background: rgba(0, 0, 0, 0.2); */
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        cursor: pointer;
        > div:first-of-type {
          border-right: 1px solid #ccc;
        }
        > div {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          font-size: 22px;

          > div:last-of-type {
            font-size: 30px;
          }
        }
      }
      .el-button {
        width: 100%;
        font-size: 20px;
      }
    }
  }
  .profile-main {
    margin-top: 60px;
    display: flex;
    justify-content: center;
  }
}
</style>
