<template>
  <div class="comment-tools">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-icon style="cursor: pointer" size="20px"><IMore /></el-icon>
      <template #dropdown>
        <el-dropdown-menu v-if="isUser(userId)">
          <el-dropdown-item command="showDiglog">
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
    <el-dialog width="50%" title="修改我的评论" v-model="dialogVisible" append-to-body destroy-on-close center>
      <Editor @update:content="(valueHtml) => (content = valueHtml)" :editComment="editData" isComment mode="simple" height="150px" />
      <el-button class="update" @click="update" type="primary">修改</el-button>
    </el-dialog>
    <!-- <ReportDialog @submit="submitReport" @cancel="isShowReport = !isShowReport" :show="isShowReport" /> -->
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { Msg } from '@/utils';
import Editor from '@/components/wang-editor/Editor.vue';

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

const content = ref('');
const dialogVisible = ref(false);
const isShowReport = ref(false);

const handleCommand = (command) => {
  command === 'showDiglog' && showDiglog();
  command === 'remove' && remove();
  command === 'report' && showReport();
};

const update = () => {
  dialogVisible.value = !dialogVisible.value;
  commentStore.updateCommentAction({ articleId: article.value.id, commentId: props.commentId, content: content.value });
};
const showDiglog = () => {
  dialogVisible.value = !dialogVisible.value;
  console.log(dialogVisible.value);
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
const showReport = () => {
  Msg.showInfo('该功能开发中');
};
</script>

<style lang="scss" scoped>
.comment-tools {
  position: absolute;
  right: 30px;
}
.update {
  margin-top: 10px;
}
</style>
