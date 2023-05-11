<template>
  <div class="detail-tool">
    <el-tooltip class="item" effect="dark" content="返回文章列表" placement="bottom">
      <i class="el-icon-back" @click="goBack">
        <el-icon><IBack /></el-icon>
      </i>
    </el-tooltip>
    <template v-if="token && isAuthor">
      <el-tooltip class="item" effect="dark" content="修改我的文章" placement="bottom">
        <i class="el-icon-edit" @click="goEdit">
          <el-icon><IEdit /></el-icon>
        </i>
      </el-tooltip>
      <el-tooltip class="item" effect="dark" content="删除我的文章" placement="bottom">
        <i class="el-icon-delete" @click="goDelete">
          <el-icon><IDelete /></el-icon>
        </i>
      </el-tooltip>
    </template>
    <template v-else-if="token">
      <el-tooltip class="item" effect="dark" content="举报文章" placement="bottom">
        <i class="el-icon-warning" @click="showReport = true">
          <el-icon><IWarning /></el-icon>
        </i>
      </el-tooltip>
    </template>
    <!-- <ReportDialog @submit="submitReport" @cancel="showReport = !showReport" :show="showReport" /> -->
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { Msg } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';

import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const router = useRouter();
const userStore = useUserStore();
const articleStore = useArticleStore();

const props = defineProps({
  isAuthor: {
    type: Boolean,
    default: false
  },
  article: {
    type: Object as PropType<IArticle>,
    default: () => {}
  }
});
const showReport = ref(false);
const { token } = storeToRefs(userStore);
const goBack = () => router.push('/article');
const goEdit = () => {
  router.push({ path: `/edit`, query: { editArticleId: props.article.id } });
};
const goDelete = () => {
  ElMessageBox.confirm(`是否删除文章`, '提示', {
    type: 'info',
    confirmButtonText: `删除`,
    cancelButtonText: `取消`
  }).then(() => {
    articleStore.removeAction(props.article.id);
    router.replace('/article');
  });
};
const submitReport = (reportOptions, otherReport) => {
  if (reportOptions.length) {
    otherReport && reportOptions.push(otherReport);
    const report = { articleId: props.article.id, reportOptions };
    console.log('文章submitReport!!!!!!!!', report);
    userStore.reportAction({ userId: props.article.author?.id, report });
    showReport.value = false;
  } else {
    Msg.showInfo('您没有提交任何举报信息');
    showReport.value = false;
  }
};
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
