<template>
  <div class="detail-tool">
    <el-tooltip class="item" effect="dark" content="返回文章列表" placement="bottom">
      <i class="el-icon-back" @click="goBack">
        <el-icon><Back /></el-icon>
      </i>
    </el-tooltip>
    <template v-if="token && isAuthor">
      <el-tooltip class="item" effect="dark" content="修改我的文章" placement="bottom">
        <i class="el-icon-edit" @click="goEdit">
          <el-icon><Edit /></el-icon>
        </i>
      </el-tooltip>
      <el-tooltip class="item" effect="dark" content="删除我的文章" placement="bottom">
        <i class="el-icon-delete" @click="goDelete">
          <el-icon><Delete /></el-icon>
        </i>
      </el-tooltip>
    </template>
    <template v-else-if="token">
      <el-tooltip class="item" effect="dark" content="举报文章" placement="bottom">
        <i class="el-icon-warning" @click="showReport = true">
          <el-icon><Warning /></el-icon>
        </i>
      </el-tooltip>
    </template>
    <!-- <ReportDialog @submit="submitReport" @cancel="cancelReport" :show="showReport" /> -->
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import useUserStore from '@/stores/user';
import { Back, Edit, Delete, Warning } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const userStore = useUserStore();
defineProps({
  isAuthor: {
    type: Boolean,
    default: false
  },
  article: {
    type: Object,
    default: () => {}
  }
});
const showReport = ref(false);
const { token } = storeToRefs(userStore);
const goBack = () => {
  router.push('/article');
};
const goEdit = () => {};
const goDelete = () => {};
const submitReport = () => {};
const cancelReport = () => {};
</script>

<style lang="scss" scoped>
.detail-tool {
  display: flex;
  align-items: center;
  .el-icon-back,
  .el-icon-edit,
  .el-icon-warning,
  .el-icon-delete {
    cursor: pointer;
    transition: all 0.3s;
    margin-left: 25px;
  }
  .el-icon-edit:hover,
  .el-icon-back:hover,
  .el-icon-warning:hover,
  .el-icon-delete:hover {
    transform: translate(-6px, 0);
  }
  .el-icon-back {
    font-size: 40px;
  }
  .el-icon-edit {
    font-size: 30px;
  }
  .el-icon-delete {
    font-size: 30px;
  }
  .el-icon-warning {
    font-size: 30px;
  }
}
</style>
