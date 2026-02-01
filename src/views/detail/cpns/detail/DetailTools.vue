<template>
  <div class="detail-tool">
    <el-tooltip class="item" effect="dark" content="返回文章列表" placement="bottom">
      <i class="el-icon-back" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
      </i>
    </el-tooltip>
    <template v-if="token && isAuthor">
      <el-tooltip class="item" effect="dark" content="修改我的文章" placement="bottom">
        <i class="el-icon-edit" @click="goEdit">
          <el-icon><Edit /></el-icon>
        </i>
      </el-tooltip>
      <el-tooltip class="item" effect="dark" content="删除我的文章" placement="bottom">
        <i class="el-icon-delete" @click="remove">
          <el-icon><Trash2 /></el-icon>
        </i>
      </el-tooltip>
    </template>
    <template v-else-if="token">
      <el-tooltip class="item" effect="dark" content="举报文章" placement="bottom">
        <i class="el-icon-warning" @click="isShowReport = true">
          <el-icon><AlertTriangle /></el-icon>
        </i>
      </el-tooltip>
    </template>
    <ReportDialog @submit="submitReport" @cancel="isShowReport = !isShowReport" :show="isShowReport" />
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { Msg } from '@/utils';
import ReportDialog from '@/components/dialog/ReportDialog.vue';
import { ArrowLeft, Edit, Trash2, AlertTriangle } from 'lucide-vue-next';

import type { IArticle } from '@/stores/types/article.result';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
const router = useRouter();
const userStore = useUserStore();
const articleStore = useArticleStore();

const { isAuthor = false, article = {} } = defineProps<{
  isAuthor?: boolean;
  article?: IArticle;
}>();
const isShowReport = ref(false);
const { token } = storeToRefs(userStore);
const goBack = () => {
  // 如果有历史记录，则返回；否则跳转到文章列表页
  if (window.history.state && window.history.state.back) {
    router.back();
  } else {
    router.push('/article');
  }
};
// 编辑-------------------------------------------------------
const goEdit = () => {
  router.push({ path: `/edit`, query: { editArticleId: article.id } });
};
// 删除-------------------------------------------------------
const remove = () => {
  ElMessageBox.confirm(`是否删除文章`, '提示', {
    type: 'info',
    confirmButtonText: `删除`,
    cancelButtonText: `取消`,
  }).then(() => {
    articleStore.removeAction(article.id);
  });
};
// 举报-------------------------------------------------------
const submitReport = ({ reportOptions, otherReport }) => {
  console.log('submitReport submitReport');
  if (reportOptions.length || otherReport) {
    otherReport && reportOptions.push(otherReport);
    const report = { articleId: article.id, reportOptions };
    userStore.reportAction({ userId: article.author?.id, report });
    isShowReport.value = false;
  } else {
    Msg.showInfo('您没有提交任何举报信息');
    isShowReport.value = false;
  }
};
</script>

<style lang="scss" scoped>
.detail-tool {
  display: flex;
  align-items: center;
  margin-top: 5px;
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
    font-size: 36px;
  }
  .el-icon-edit,
  .el-icon-delete,
  .el-icon-warning {
    font-size: 30px;
  }
}
</style>
