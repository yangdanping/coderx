<template>
  <div class="comment-tools">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-icon style="cursor: pointer" size="20px"><MoreHorizontal /></el-icon>
      <template #dropdown>
        <el-dropdown-menu v-if="isOwner">
          <el-dropdown-item command="edit">
            <el-icon size="20px"><Edit /></el-icon>
          </el-dropdown-item>
          <el-dropdown-item command="remove">
            <el-icon size="20px"><Trash2 /></el-icon>
          </el-dropdown-item>
        </el-dropdown-menu>
        <el-dropdown-menu v-else>
          <el-dropdown-item command="report">
            <el-icon size="20px"><AlertTriangle /></el-icon>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 编辑对话框 -->
    <el-dialog width="50%" title="修改我的评论" v-model="isShowEdit" append-to-body destroy-on-close center>
      <Editor @update:content="(valueHtml) => (editContent = valueHtml)" :editComment="comment.content" isComment mode="simple" height="150px" />
      <el-button @click="submitEdit" :loading="isUpdating" type="primary" style="margin-top: 10px">修改</el-button>
    </el-dialog>

    <!-- 举报对话框 -->
    <ReportDialog @submit="submitReport" @cancel="isShowReport = false" :show="isShowReport" />
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { Msg } from '@/utils';
import Editor from '@/components/wang-editor/Editor.vue';
import ReportDialog from '@/components/dialog/ReportDialog.vue';
import { useRoute } from 'vue-router';
import { MoreHorizontal, Edit, Trash2, AlertTriangle } from 'lucide-vue-next';

import useUserStore from '@/stores/user.store';
import { useUpdateComment, useDeleteComment } from '@/composables/useCommentList';

import type { IComment } from '@/service/comment/comment.request';

const props = defineProps<{
  comment: IComment;
  parentCommentId?: number; // 如果是回复，传入父评论ID
}>();

const route = useRoute();
const userStore = useUserStore();

const articleId = computed(() => String(route.params.articleId || ''));
const parentId = computed(() => props.parentCommentId);

// 是否为评论所有者
const isOwner = computed(() => userStore.isUser(props.comment.author?.id));

// 状态
const isShowEdit = ref(false);
const isShowReport = ref(false);
const editContent = ref('');
const isUpdating = ref(false);

// Mutations（传入父评论ID用于刷新回复列表）
const updateMutation = useUpdateComment(articleId, parentId);
const deleteMutation = useDeleteComment(articleId, parentId);

// 处理菜单命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'edit':
      isShowEdit.value = true;
      break;
    case 'remove':
      handleRemove();
      break;
    case 'report':
      isShowReport.value = true;
      break;
  }
};

// 提交编辑
const submitEdit = async () => {
  if (!editContent.value.trim()) {
    Msg.showInfo('评论内容不能为空');
    return;
  }

  isUpdating.value = true;
  try {
    await updateMutation.mutateAsync({
      commentId: props.comment.id,
      content: editContent.value,
    });
    isShowEdit.value = false;
  } finally {
    isUpdating.value = false;
  }
};

// 处理删除
const handleRemove = () => {
  ElMessageBox.confirm('是否删除该评论？', '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  }).then(() => {
    deleteMutation.mutate(props.comment.id);
  });
};

// 提交举报
const submitReport = ({ reportOptions, otherReport }: { reportOptions: string[]; otherReport: string }) => {
  if (reportOptions.length || otherReport) {
    const options = [...reportOptions];
    if (otherReport) options.push(otherReport);
    const report = { commentId: props.comment.id, reportOptions: options };
    userStore.reportAction({ userId: props.comment.author?.id, report });
    isShowReport.value = false;
    Msg.showSuccess('举报已提交');
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
  top: 20px;
}
</style>
