<template>
  <div class="user-profile">
    <div class="profile-header">
      <UserAvatar :info="profile" />
      <div class="profile-info">
        <div class="profile-item-1">
          <span class="name">{{ profile.name }}</span>
          <img :src="userSex" alt="" />
          <template v-if="isUser(profile.id)">
            <el-tooltip effect="dark" content="修改个人信息" placement="bottom">
              <el-icon @click="updateProfile" class="edit" size="30" color="#999"> <Edit /> </el-icon>
            </el-tooltip>
          </template>
          <el-tag size="small" effect="plain" :type="userOnlineStatus(profile.name).type">{{ userOnlineStatus(profile.name).msg }}</el-tag>
        </div>
        <template v-for="info in infos" :key="info.label">
          <div class="profile-item-other">
            <Icon :type="info.icon" :showLabel="false" />
            <span class="label">{{ info.label }}:</span>
            <span class="value">{{ info.value }}</span>
          </div>
        </template>
      </div>
      <div class="profile-right">
        <div>
          <div class="btn" @click="goFollowTab('following')">
            <div>关注数</div>
            <div>{{ followCount('following') }}</div>
          </div>
          <div class="btn" @click="goFollowTab('follower')">
            <div>粉丝数</div>
            <div>{{ followCount('follower') }}</div>
          </div>
        </div>
        <FollowButton :isFollowed="isFollowed" :profile="profile" />
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
import Icon from '@/components/icon/Icon.vue';
import { Edit } from 'lucide-vue-next';
import type { IUserInfo } from '@/stores/types/user.result';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import useHistoryStore from '@/stores/history.store';
const rootStore = useRootStore();
const userStore = useUserStore();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const historyStore = useHistoryStore();
const { isFollowed, followCount, isUser, onlineUsers, userOnlineStatus } = storeToRefs(userStore);

const { profile = {} } = defineProps<{
  profile: IUserInfo;
}>();

const infos = computed(() => {
  return [
    {
      label: '年龄',
      value: profile.age ?? '无',
      icon: 'coin',
    },
    {
      label: '职业',
      value: profile.career ?? 'Coder',
      icon: 'suitcase',
    },
    {
      label: '居住地',
      value: profile.address ?? 'CoderX星球',
      icon: 'coordinate',
    },
    {
      label: '邮箱',
      value: profile.email ?? '无',
      icon: 'takeaway-box',
    },
  ] as any[];
});

const goFollowTab = (subTabName: string) => {
  console.log('goFollowTab subTabName', subTabName);
  emitter.emit('changeFollowTab', subTabName); //在UserProfileMenu中改变大Tab,在UserFollow中改变小Tab
};

const userSex = computed(() => getImageUrl('user', `${profile.sex === '女' ? 'female' : 'male'}-icon`));

const route = useRoute();

const updateProfile = () => {
  rootStore.toggleLoginDialog();
  emitter.emit('updateProfile', JSON.parse(JSON.stringify(profile))); //深拷贝
};

const tabClick = ({ paneName }) => {
  const userId = route.params.userId as any;
  rootStore.$reset(); //初始化分页数据
  console.log('tabClick', userId, paneName);
  switch (paneName) {
    case '文章':
      userStore.getProfileAction(userId);
      articleStore.refreshFirstPageAction({ userId });
      break;
    case '评论':
      // userStore.getCommentAction(userId);
      commentStore.getCommentAction('', userId);
      break;
    case '收藏':
      userStore.getCollectAction(userId);
      useArticleStore().initArticle();
      break;
    case '关注':
      emitter.emit('updateFollowList');
      userStore.getFollowAction(userId);
      break;
    case '最近浏览':
      historyStore.resetHistory();
      historyStore.getHistoryAction(true);
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
  width: 75%;
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
      .profile-item-1 {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        .name {
          font-weight: 700;
          font-size: 35px;
        }
        .edit {
          cursor: pointer;
          margin-top: 5px;
        }
      }

      .profile-item-other {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        font-size: 16px;
        gap: 3px;
      }
    }
    .profile-right {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      > div {
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
          &:hover {
            color: #409eff;
          }

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
