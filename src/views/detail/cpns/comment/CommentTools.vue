<template>
  <div class="comment-tools">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-icon style="cursor: pointer" size="20px"><IMore /></el-icon>
      <template #dropdown>
        <el-dropdown-menu v-if="isUser(userId)">
          <el-dropdown-item command="edit">
            <el-icon size="20px"><IEdit /></el-icon>
          </el-dropdown-item>
          <el-dropdown-item command="remove">
            <el-icon size="20px"><IDelete /></el-icon>
          </el-dropdown-item>
        </el-dropdown-menu>
        <el-dropdown-menu v-else>
          <el-dropdown-item command="report">
            <el-icon size="20px"><IWarning /></el-icon>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <el-dialog width="50%" title="修改我的评论" v-model="isShowEdit" append-to-body destroy-on-close center>
      <Editor @update:content="(valueHtml) => (content = valueHtml)" :editComment="editData" isComment mode="simple" height="150px" />
      <el-button @click="submitEdit" type="primary" style="margin-top: 10px">修改</el-button>
    </el-dialog>
    <ReportDialog @submit="submitReport" @cancel="isShowReport = !isShowReport" :show="isShowReport" />
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { Msg } from '@/utils';
import Editor from '@/components/wang-editor/Editor.vue';
import ReportDialog from '@/components/dialog/ReportDialog.vue';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';
const userStore = useUserStore();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { article } = storeToRefs(articleStore);
const { isUser } = storeToRefs(userStore);

const {
  editData = '',
  userId,
  commentId,
} = defineProps<{
  editData?: string;
  userId?: number;
  commentId?: number;
}>();

const content = ref('');
const isShowEdit = ref(false);
const isShowReport = ref(false);

const handleCommand = (command) => {
  command === 'edit' && edit();
  command === 'remove' && remove();
  command === 'report' && (isShowReport.value = true);
};
// 编辑-------------------------------------------------------
const edit = () => {
  isShowEdit.value = !isShowEdit.value;
  console.log(isShowEdit.value);
};
const submitEdit = () => {
  isShowEdit.value = !isShowEdit.value;
  commentStore.updateCommentAction({ articleId: article.value.id, commentId: commentId, content: content.value });
};

// 删除-------------------------------------------------------
const remove = () => {
  ElMessageBox.confirm(`是否删除评论`, '提示', {
    type: 'info',
    confirmButtonText: `删除`,
    cancelButtonText: `取消`,
  }).then(() => {
    commentStore.removeCommentAction({ articleId: article.value.id, commentId: commentId });
  });
};
// 举报-------------------------------------------------------
const submitReport = ({ reportOptions, otherReport }) => {
  console.log('submitReport submitReport');
  if (reportOptions.length || otherReport) {
    otherReport && reportOptions.push(otherReport);
    const report = { commentId: commentId, reportOptions };
    userStore.reportAction({ userId: userId, report });
    isShowReport.value = false;
  } else {
    Msg.showInfo('您没有提交任何举报信息');
    isShowReport.value = false;
  }
};
</script>

<style lang="scss" scoped>
.comment-tools {
  position: absolute;
  right: 30px;
}
</style>
