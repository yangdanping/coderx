<template>
  <div class="comment-tools">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-icon style="cursor: pointer" size="20px"><More /></el-icon>
      <template #dropdown>
        <el-dropdown-menu v-if="isUser(userId)">
          <el-dropdown-item command="showDiglog">
            <el-icon size="20px"><Edit /></el-icon>
            <el-dialog width="50%" title="修改我的评论" v-model:propName="dialogVisible" append-to-body>
              <Editor @update:content="updateContent" :editComment="editData" :isComment="true" height="300px" />
              <el-button class="update" @click="update" type="primary">修改</el-button>
            </el-dialog>
          </el-dropdown-item>
          <el-dropdown-item command="remove">
            <el-icon size="20px"><Delete /></el-icon>
          </el-dropdown-item>
        </el-dropdown-menu>
        <el-dropdown-menu v-else>
          <el-dropdown-item @click="showReport = true">
            <el-icon size="20px"><Warning /></el-icon>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <!-- <ReportDialog @submit="submitReport" @cancel="cancelReport" :show="showReport" /> -->
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { More, Edit, Delete, Warning } from '@element-plus/icons-vue';

import { Msg } from '@/utils';

import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import useCommentStore from '@/stores/comment';
const userStore = useUserStore();
const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { article } = storeToRefs(articleStore);
const { isUser } = storeToRefs(userStore);

const props = defineProps({
  editData: {
    type: String,
    default: ''
  },
  userId: {
    type: Number
  },
  commentId: {
    type: Number
  }
});

const dialogVisible = ref(false);
const content = ref('');
const showReport = ref(false);

const handleCommand = (command) => {
  command === 'showDiglog' ? showDiglog() : null;
  command === 'remove' ? remove() : null;
};
const showDiglog = () => {
  dialogVisible.value = !dialogVisible.value;
};
const updateContent = (valueHtml: string) => {
  content.value = valueHtml;
};
const update = () => {
  commentStore.updateCommentAction({ articleId: article.value.id, commentId: props.commentId, content: content.value });
  dialogVisible.value = !dialogVisible.value;
};
const remove = () => {
  ElMessageBox.confirm(`是否删除评论`, '提示', {
    type: 'info',
    confirmButtonText: `删除`,
    cancelButtonText: `取消`
  }).then(() => {
    commentStore.removeCommentAction({ articleId: article.value.id, commentId: props.commentId });
  });
};
//举报
const submitReport = (reportOptions, otherReport) => {
  if (reportOptions.length) {
    otherReport && reportOptions.push(otherReport);
    const report = { commentId: props.commentId, reportOptions };
    userStore.reportAction({ userId: props.userId, report });
    showReport.value = false;
  } else {
    Msg.showInfo('您没有提交任何举报信息');
    showReport.value = false;
  }
};
const cancelReport = () => {
  showReport.value = !showReport.value;
};
</script>

<style lang="scss" scoped>
.comment-tools {
  display: none;
  position: absolute;
  right: 10px;
}
.update {
  margin-top: 10px;
}
</style>
