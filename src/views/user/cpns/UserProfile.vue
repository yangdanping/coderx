<template>
  <div class="user-profile" :class="{ 'is-mobile': isSmallScreen }">
    <aside class="profile-sidebar" :class="{ 'sticky-header': isSmallScreen }">
      <div class="profile-card">
        <div class="card-header">
          <UserAvatar :info="profile" :size="isSmallScreen ? 70 : 100" />
          <div class="mobile-header-right" v-if="isSmallScreen">
            <div class="name-row">
              <span class="name">{{ profile.name }}</span>
              <component :is="genderIcon" :class="['gender-icon', genderClass]" />
              <el-tag size="small" effect="plain" :type="onlineStatus.type">{{ onlineStatus.msg }}</el-tag>
            </div>

            <div class="stats-mobile">
              <div class="stat-item" @click="goFollowTab('following')">
                <span class="count">{{ followingCount }}</span>
                <span class="label">关注</span>
              </div>
              <div class="stat-item" @click="goFollowTab('follower')">
                <span class="count">{{ followerCount }}</span>
                <span class="label">粉丝</span>
              </div>
            </div>

            <div class="actions-mobile">
              <el-button v-if="isMe" class="edit-btn" size="small" @click="updateProfile">编辑资料</el-button>
              <FollowButton v-else :isFollowed="isFollowed" :profile="profile" width="auto" size="small" />
            </div>
          </div>
        </div>

        <!-- Mobile Info Details -->
        <div class="mobile-info-details" v-if="isSmallScreen">
          <span v-for="(info, index) in infos" :key="info.label"> {{ info.value }}<span v-if="index < infos.length - 1" class="separator">·</span> </span>
        </div>

        <div class="profile-info">
          <div class="name-row" v-if="!isSmallScreen">
            <span class="name">{{ profile.name }}</span>
            <component :is="genderIcon" :class="['gender-icon', genderClass]" />
            <el-tag size="small" effect="plain" :type="onlineStatus.type">{{ onlineStatus.msg }}</el-tag>
          </div>

          <!-- Desktop Stats -->
          <div class="stats-desktop" v-if="!isSmallScreen">
            <div class="stat-item" @click="goFollowTab('following')">
              <span class="label">关注</span>
              <span class="count">{{ followingCount }}</span>
            </div>
            <div class="divider"></div>
            <div class="stat-item" @click="goFollowTab('follower')">
              <span class="label">粉丝</span>
              <span class="count">{{ followerCount }}</span>
            </div>
          </div>

          <!-- Desktop Info Details -->
          <div class="info-details" v-if="!isSmallScreen">
            <template v-for="info in infos" :key="info.label">
              <div class="info-item">
                <Icon :type="info.icon" :showLabel="false" />
                <span class="value">{{ info.value }}</span>
              </div>
            </template>
          </div>

          <!-- Action Buttons -->
          <div class="actions" v-if="!isSmallScreen">
            <template v-if="isMe">
              <el-button class="edit-btn" @click="updateProfile">编辑资料</el-button>
            </template>
            <FollowButton v-else :isFollowed="isFollowed" :profile="profile" />
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="profile-tabs">
        <Tabs v-model="activeTab" :direction="isSmallScreen ? 'horizontal' : 'vertical'">
          <TabItem name="文章" label="文章" />
          <TabItem name="评论" label="评论" />
          <TabItem name="收藏" label="收藏" />
          <TabItem name="关注" label="关注" />
          <TabItem v-if="isMe" name="最近浏览" label="最近浏览" />
        </Tabs>
      </div>
    </aside>

    <main class="profile-content">
      <UserProfileMenu :activeName="activeTab" />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Mars, Venus } from 'lucide-vue-next';
import { emitter } from '@/utils';
import UserAvatar from './UserAvatar.vue';
import UserProfileMenu from './UserProfileMenu.vue';
import FollowButton from '@/components/FollowButton.vue';
import Icon from '@/components/icon/Icon.vue';
import Tabs from '@/components/common/Tabs.vue';
import TabItem from '@/components/common/TabItem.vue';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
import useHistoryStore from '@/stores/history.store';
import { useAuth } from '@/composables/useAuth';

import type { IUserInfo } from '@/stores/types/user.result';
import type { FollowSubTabName, ProfileInfoItem, ProfileQuery, ProfileTabName } from './types/user-profile.type';

const DEFAULT_TAB: ProfileTabName = '文章';
const DEFAULT_FOLLOW_SUB_TAB: FollowSubTabName = 'following';
const TAB_NAMES: ProfileTabName[] = ['文章', '评论', '收藏', '关注', '最近浏览'];

const rootStore = useRootStore();
const userStore = useUserStore();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const historyStore = useHistoryStore();
const { isCurrentUser } = useAuth();
const route = useRoute();
const router = useRouter();

const { isFollowed, followCount, userOnlineStatus } = storeToRefs(userStore);
const { isSmallScreen } = storeToRefs(rootStore);

const props = defineProps<{
  profile: IUserInfo;
}>();
const profile = toRef(props, 'profile');

// 当前访问的用户由路由 params 决定，编辑按钮和“最近浏览”权限都依赖它。
const currentUserId = computed(() => {
  const userId = route.params.userId;
  return typeof userId === 'string' ? userId : '';
});
const isMe = computed(() => isCurrentUser(currentUserId.value));
const currentProfilePath = computed(() => (currentUserId.value ? `/user/${currentUserId.value}` : ''));

const genderIcon = computed(() => (profile.value.sex === '女' ? Venus : Mars));
const genderClass = computed(() => (profile.value.sex === '女' ? 'female' : 'male'));
const onlineStatus = computed(() => userOnlineStatus.value(profile.value.name));
const followingCount = computed(() => followCount.value('following'));
const followerCount = computed(() => followCount.value('follower'));

const infos = computed<ProfileInfoItem[]>(() => [
  { label: '年龄', value: profile.value.age ?? '无', icon: 'coin' },
  { label: '职业', value: profile.value.career ?? 'Coder', icon: 'suitcase' },
  { label: '居住地', value: profile.value.address ?? 'CoderX星球', icon: 'coordinate' },
  { label: '邮箱', value: profile.value.email ?? '无', icon: 'takeaway-box' },
]);

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function normalizeTabName(tabName?: string): ProfileTabName {
  if (tabName && TAB_NAMES.includes(tabName as ProfileTabName)) {
    if (tabName === '最近浏览' && !isMe.value) {
      return DEFAULT_TAB;
    }
    return tabName as ProfileTabName;
  }

  return DEFAULT_TAB;
}

function normalizeFollowSubTab(subTabName?: string): FollowSubTabName {
  return subTabName === 'follower' ? 'follower' : DEFAULT_FOLLOW_SUB_TAB;
}

function buildProfileQuery(tabName: ProfileTabName, subTabName?: FollowSubTabName): ProfileQuery {
  return {
    ...(tabName !== DEFAULT_TAB ? { tabName } : {}),
    ...(tabName === '关注' ? { subTabName: normalizeFollowSubTab(subTabName) } : {}),
  };
}

function isSameProfileQuery(query: Record<string, unknown>, nextQuery: ProfileQuery) {
  const currentTabName = getQueryString(query.tabName);
  const currentSubTabName = getQueryString(query.subTabName);
  return currentTabName === nextQuery.tabName && currentSubTabName === nextQuery.subTabName;
}

const normalizedTab = computed(() => normalizeTabName(getQueryString(route.query.tabName)));
const normalizedFollowSubTab = computed<FollowSubTabName | undefined>(() =>
  normalizedTab.value === '关注' ? normalizeFollowSubTab(getQueryString(route.query.subTabName)) : undefined,
);
const normalizedQuery = computed(() => buildProfileQuery(normalizedTab.value, normalizedFollowSubTab.value));

// Tabs 组件需要一个 v-model，但真正的选中态仍然以 URL 为准。
const activeTab = computed<ProfileTabName>({
  get: () => normalizedTab.value,
  set: (nextTab) => {
    navigateToTab(normalizeTabName(nextTab));
  },
});

function navigateToTab(tabName: ProfileTabName, subTabName?: FollowSubTabName) {
  if (!currentUserId.value || !currentProfilePath.value) return;

  const query = buildProfileQuery(tabName, subTabName);
  if (route.path === currentProfilePath.value && isSameProfileQuery(route.query as Record<string, unknown>, query)) {
    return;
  }

  router.push({
    path: currentProfilePath.value,
    query,
  });
}

const goFollowTab = (subTabName: FollowSubTabName) => {
  navigateToTab('关注', subTabName);
};

const updateProfile = () => {
  // 弹窗里编辑的是副本，避免直接改到当前展示中的资料对象。
  emitter.emit('updateProfile', JSON.parse(JSON.stringify(profile.value)));
};

const fetchTabData = (tabName: ProfileTabName, userId: string) => {
  const numericUserId = Number(userId);

  switch (tabName) {
    case '文章':
      articleStore.refreshFirstPageAction({ userId });
      break;
    case '评论':
      commentStore.getCommentAction('', userId);
      break;
    case '收藏':
      if (!Number.isNaN(numericUserId)) {
        userStore.getCollectAction(numericUserId);
      }
      articleStore.initArticle();
      break;
    case '关注':
      userStore.getFollowAction(userId);
      break;
    case '最近浏览':
      historyStore.resetHistory();
      historyStore.getHistoryAction(true);
      break;
  }
};

// 统一把缺省或非法 query 修正成稳定 URL，保证刷新和分享链接时状态一致。
watch(
  [currentUserId, normalizedQuery],
  ([userId, expectedQuery]) => {
    if (!userId) return;

    if (!isSameProfileQuery(route.query as Record<string, unknown>, expectedQuery)) {
      router.replace({
        path: `/user/${userId}`,
        query: expectedQuery,
      });
    }
  },
  { immediate: true },
);

// URL 只负责表达当前在哪个 tab，具体数据由 tab 变化后按需拉取。
watch(
  [currentUserId, normalizedTab],
  ([userId, tabName]) => {
    if (!userId) return;
    fetchTabData(tabName, userId);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.user-profile {
  display: flex;
  gap: 20px;
  width: 75%;
  margin: 80px auto 0;
  min-height: 80vh;

  &.is-mobile {
    flex-direction: column;
    width: 100%;
    margin-top: 0;
    gap: 0;
  }
}

.profile-sidebar {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  // 大屏幕时的 sticky 定位
  position: sticky;
  top: calc(var(--navbarHeight, 60px) + 20px);
  align-self: flex-start; // 防止被 flex 拉伸导致 sticky 失效

  &.sticky-header {
    position: sticky;
    top: var(--navbarHeight, 60px);
    width: 100%;
    @include glass-effect;
    @include thin-border(bottom, rgba(0, 0, 0, 0.05));
    padding: 10px 15px 0;
    gap: 10px;
    z-index: var(--z-sticky);

    .profile-card {
      margin-bottom: 0;
    }
  }

  .profile-card {
    display: flex;
    flex-direction: column;

    .card-header {
      display: flex;
      align-items: flex-start; // Align top
      gap: 15px;

      .mobile-header-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;

        .name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap; // Allow wrapping if name is long
          .name {
            font-size: 18px;
            font-weight: bold;
          }
          .gender-icon {
            width: 16px;
            height: 16px;
            &.male {
              color: #409eff;
            }
            &.female {
              color: #f56c6c;
            }
          }
        }

        .stats-mobile {
          display: flex;
          gap: 20px; // Spacing between Following and Followers

          .stat-item {
            display: flex;
            align-items: baseline;
            gap: 4px;
            cursor: pointer;

            .count {
              font-weight: bold;
              font-size: 14px;
              color: #333;
            }
            .label {
              font-size: 12px;
              color: #666;
            }
          }
        }

        .actions-mobile {
          margin-top: 2px;
          width: fit-content; // Auto width

          .edit-btn {
            width: auto; // Auto width
          }
        }
      }
    }

    .mobile-info-details {
      margin-top: 12px;
      font-size: 13px;
      color: #666;
      line-height: 1.4;

      .separator {
        margin: 0 6px;
        color: #ddd;
      }
    }

    .profile-info {
      margin-top: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .name-row {
        display: flex;
        align-items: center;
        gap: 8px;
        .name {
          font-size: 20px;
          font-weight: bold;
        }
        .gender-icon {
          width: 18px;
          height: 18px;
          &.male {
            color: #409eff;
          }
          &.female {
            color: #f56c6c;
          }
        }
      }

      .stats-desktop {
        display: flex;
        align-items: center;
        gap: 15px;
        margin: 5px 0;

        .stat-item {
          display: flex;
          gap: 5px;
          cursor: pointer;
          &:hover {
            color: var(--el-color-primary);
          }
          .label {
            color: #666;
          }
          .count {
            font-weight: bold;
          }
        }

        .divider {
          width: 1px;
          height: 12px;
          background: #eee;
        }
      }

      .info-details {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 14px;
        }
      }

      .actions {
        margin-top: 10px;
        .edit-btn {
          width: 100%;
        }
        .edit-icon {
          cursor: pointer;
          position: absolute;
          top: 10px;
          right: 10px;
        }
      }
    }
  }

  // Mobile specific adjustments for header layout
  &.sticky-header {
    // Clean up or overrides if needed
    padding-bottom: 10px;
    padding-left: 10px; // Add some bottom padding
  }
}

.profile-content {
  flex: 1;
  min-width: 0; // Prevent flex overflow
  // padding-bottom: 20px;
}
</style>
