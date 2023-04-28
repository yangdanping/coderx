<template>
  <div class="avatar">
    <el-avatar :src="avatarUrl" :size="60" />
    <!-- <el-popover :disabled="disabled" placement="top-start" trigger="hover" :open-delay="400">
      <div class="user">
        <el-avatar src="../../assets/img/user/avatar.png" :size="60" />
        <div>
          <div class="user-info">
            <h2>{{ info.name }}</h2>
            <img :src="userSex" alt="" />
          </div>
          <span class="follow">关注:{{ followCount('following') }}</span>
          <span>粉丝:{{ followCount('follower') }}</span>
        </div>
      </div>
      <div class="user-profile">
        <span>{{ info.career ?? 'Coder' }}</span>
        <template v-if="!isUser(info.id)">
          <el-button @click="follow" :type="!isFollowed ? 'primary' : ''" :icon="!isFollowed ? 'el-icon-plus' : ''" size="mini">
            {{ !isFollowed ? '关注' : '已关注' }}
          </el-button>
        </template>
      </div>
      <el-avatar @mouseenter="mouseenter" @click="goProfile" :src="avatarUrl" :size="size" slot="reference" />
    </el-popover>
    <div class="avatar-set" v-if="showSet && isUser(info.id)"><i class="el-icon-edit"></i></div> -->
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import useUserStore from '@/stores/user';
const userStore = useUserStore();
const props = defineProps({
  info: {
    type: Object,
    default: () => {}
  },
  size: {
    type: [Number, String]
  },
  showSet: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});
const defaultAvatar = new URL('@/assets/img/user/avatar.png', import.meta.url).href;
// const { userInfo } = storeToRefs(userStore);
const avatarUrl = computed(() => props.info.avatarUrl ?? defaultAvatar);
</script>

<style lang="scss" scoped>
.avatar {
  cursor: pointer;
}
</style>
